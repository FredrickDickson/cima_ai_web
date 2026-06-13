import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

// ─── CHUNKING ────────────────────────────────────────────────────────────────

interface Chunk {
  title: string;
  citation: string;
  content: string;
}

function chunkByArticle(fullText: string, titlePrefix: string): Chunk[] {
  const articleRegex =
    /(?=\b(?:Article|Rule|Section|Chapter|Part)\s+\d+[\.\s])/gi;
  const parts = fullText.split(articleRegex).filter((p) => p.trim().length > 30);

  const chunks: Chunk[] = [];
  for (const part of parts) {
    const headingMatch = part.match(
      /^((?:Article|Rule|Section|Chapter|Part)\s+\d+[.:—\s][^\n]*)/i
    );
    const heading = headingMatch
      ? headingMatch[1].replace(/\s+/g, " ").trim()
      : null;
    const content = part.replace(/\s+/g, " ").trim();
    if (content.length < 40) continue;

    const numMatch = (heading || content).match(
      /(?:Article|Rule|Section|Chapter|Part)\s+(\d+)/i
    );
    const num = numMatch ? numMatch[1] : null;

    chunks.push({
      title: heading ? `${titlePrefix} — ${heading}` : titlePrefix,
      citation: num ? `${titlePrefix}, ${(heading ?? "").split(/[.:—\s]/)[0]?.trim() || num}` : titlePrefix,
      content,
    });
  }

  // Fall back to character-based chunks if structural parsing found nothing
  return chunks.length >= 3 ? chunks : charChunk(fullText, titlePrefix);
}

function charChunk(text: string, titlePrefix: string, size = 1000, overlap = 150): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 1;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let slice = text.slice(start, end);

    if (end < text.length) {
      const lastStop = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf(".\n"),
        slice.lastIndexOf("\n\n")
      );
      if (lastStop > size * 0.5) slice = slice.slice(0, lastStop + 1);
    }

    const content = slice.trim();
    if (content.length > 40) {
      chunks.push({
        title: `${titlePrefix} — Part ${idx}`,
        citation: titlePrefix,
        content,
      });
      idx++;
    }
    start = end - overlap;
  }
  return chunks;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const {
      storage_path,
      source_type = "statute",
      jurisdiction = "ghana",
      citation: citationOverride,
    }: {
      storage_path: string;
      source_type?: string;
      jurisdiction?: string;
      citation?: string;
    } = body;

    if (!storage_path) {
      return new Response(
        JSON.stringify({ error: "storage_path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const fullText = await extractText(bytes, mimeType);
    console.log(`[ingest] Extracted ${fullText.length} characters`);

    if (fullText.trim().length < 50) {
      throw new Error("Extracted text too short — file may be empty or image-only");
    }

    // Chunk content
    const chunks = chunkByArticle(fullText, titlePrefix);
    console.log(`[ingest] ${chunks.length} chunks`);

    // Remove existing library entries for this document
    await supabase
      .from("legal_library")
      .delete()
      .ilike("title", `${titlePrefix}%`);

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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
