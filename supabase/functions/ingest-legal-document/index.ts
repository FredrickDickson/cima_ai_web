import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { stripWatermarks } from "../_shared/sanitize-legal-text.ts";
import { chunkByArticle } from "../_shared/chunking.ts";
import { enforceRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, HttpError } from "../_shared/http-error.ts";
import { requireString } from "../_shared/validate.ts";

/**
 * This is an internal pipeline endpoint (invoked by the legal-documents
 * storage-upload trigger), not a user-facing one — so it's gated by a shared
 * secret instead of a user session, mirroring convex/lib/ingestAuth.ts's
 * requireIngestSecret pattern for the same kind of internal-only function.
 */
function requireIngestSecret(req: Request): void {
  const expected = Deno.env.get("INGEST_SECRET");
  const provided = req.headers.get("x-ingest-secret");
  if (!expected || provided !== expected) {
    throw new HttpError(401, "Unauthorized: invalid or missing ingest secret");
  }
}

/** Escapes ILIKE metacharacters so caller-supplied text (citation/filename)
 * can't widen the delete pattern beyond a literal-prefix match. */
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

// ─── TEXT EXTRACTION ─────────────────────────────────────────────────────────

async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import(
    "npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs"
  );
  // No worker needed in Deno server environment
  (GlobalWorkerOptions as { workerSrc: string }).workerSrc = "";

  const pdf = await getDocument({
    data: buffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // deno-lint-ignore no-explicit-any
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(text);
  }
  return pages.join("\n");
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("npm:mammoth@1.12.0");
  const result = await mammoth.default.extractRawText({ buffer });
  return result.value;
}

async function extractText(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    return await extractPdfText(bytes);
  }
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/msword"
  ) {
    return await extractDocxText(bytes.buffer);
  }
  // Plain text or fallback
  return new TextDecoder().decode(bytes);
}

// ─── EMBEDDINGS ──────────────────────────────────────────────────────────────

async function getEmbeddings(texts: string[], hfKey: string): Promise<(number[] | null)[]> {
  if (!hfKey) return texts.map(() => null);
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      }
    );
    if (!res.ok) return texts.map(() => null);
    const data = await res.json();
    return Array.isArray(data) ? data : texts.map(() => null);
  } catch {
    return texts.map(() => null);
  }
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    requireIngestSecret(req);
    await enforceRateLimit(supabase, clientIp(req), "ingest-legal-document", 30, 60);

    const body = await req.json();
    const storage_path = requireString(body.storage_path, "storage_path", { maxLength: 500 });
    const source_type = requireString(body.source_type ?? "statute", "source_type", { maxLength: 50 });
    const jurisdiction = requireString(body.jurisdiction ?? "ghana", "jurisdiction", { maxLength: 100 });
    const citationOverride = body.citation === undefined ? undefined : requireString(body.citation, "citation", { maxLength: 300 });

    const fileName = storage_path.split("/").pop() ?? storage_path;
    const titlePrefix = citationOverride ?? fileName.replace(/\.[^/.]+$/, "");

    console.log(`[ingest] Starting: ${storage_path}`);

    // Mark as processing
    await supabase
      .from("legal_document_ingestion")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("storage_path", storage_path);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("legal-documents")
      .download(storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Download failed: ${downloadError?.message ?? "no data"}`);
    }

    // Determine MIME type from file extension
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      txt: "text/plain",
    };
    const mimeType = mimeMap[ext] ?? "text/plain";

    // Extract text
    console.log(`[ingest] Extracting text (${mimeType})...`);
    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const fullText = stripWatermarks(await extractText(bytes, mimeType));
    console.log(`[ingest] Extracted ${fullText.length} characters`);

    if (fullText.trim().length < 50) {
      throw new Error("Extracted text too short — file may be empty or image-only");
    }

    // Chunk content
    const chunks = chunkByArticle(fullText, titlePrefix);
    console.log(`[ingest] ${chunks.length} chunks`);

    // Remove existing library entries for this document (re-ingest replace).
    // titlePrefix can come from caller-supplied citation/filename text, so
    // its ILIKE metacharacters (%, _) are escaped first — otherwise a
    // crafted citation could widen this into a mass delete across unrelated
    // legal_library rows.
    await supabase
      .from("legal_library")
      .delete()
      .ilike("title", `${escapeLikePattern(titlePrefix)}%`);

    // Embed + insert in batches of 10
    let inserted = 0;
    const BATCH = 10;

    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const embeddings = await getEmbeddings(batch.map((c) => c.content), hfKey);

      const rows = batch.map((chunk, j) => ({
        title: chunk.title,
        content: chunk.content,
        embedding: embeddings[j] ?? null,
        source_type,
        jurisdiction,
        citation: chunk.citation,
      }));

      const { error: insErr } = await supabase.from("legal_library").insert(rows);
      if (insErr) throw new Error(`Insert batch ${i / BATCH + 1}: ${insErr.message}`);
      inserted += rows.length;

      // Small delay to avoid HuggingFace rate limits
      if (i + BATCH < chunks.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Mark ingestion as completed
    await supabase
      .from("legal_document_ingestion")
      .update({
        status: "completed",
        chunks_created: inserted,
        updated_at: new Date().toISOString(),
      })
      .eq("storage_path", storage_path);

    console.log(`[ingest] Done — ${inserted} chunks inserted`);

    return new Response(
      JSON.stringify({ success: true, chunks_inserted: inserted, file: fileName }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ingest] Error:", message);

    // Try to mark as failed (best effort)
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.storage_path) {
        await supabase
          .from("legal_document_ingestion")
          .update({
            status: "failed",
            error_message: message,
            updated_at: new Date().toISOString(),
          })
          .eq("storage_path", body.storage_path);
      }
    } catch { /* ignore */ }

    return errorResponse(err, cors);
  }
});
