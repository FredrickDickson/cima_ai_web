import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, HttpError } from "../_shared/http-error.ts";
import { requireString, requireUUID } from "../_shared/validate.ts";
import { getEmbeddings } from "../_shared/legal-retrieval.ts";
import { chunkBySentenceBoundary } from "../_shared/text-chunking.ts";

// A flat text.slice(0, N) only ever sees a long document's opening pages, so
// summary/risk_score/key_provisions for e.g. a 50-page contract used to
// reflect nothing past the front matter. Sampling evenly spaced windows
// across the whole document instead means the analysis sees content from
// every part of it within the same character budget.
function buildRepresentativeExcerpt(text: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text;
  const sampleCount = 8;
  const budgetPerSample = Math.floor(maxChars / sampleCount);
  const parts: string[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const start = Math.floor((i / sampleCount) * text.length);
    parts.push(text.slice(start, start + budgetPerSample));
  }
  return parts.join("\n...\n");
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  let ownedDocumentId: string | undefined;

  try {
    const verifiedUser = await requireUser(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await enforceRateLimit(supabase, verifiedUser.id, "embed-document", 10, 60);

    const body = await req.json();
    const document_id = requireUUID(body.document_id, "document_id");
    const text_content = requireString(body.text_content, "text_content", { maxLength: 20000000 });
    const user_id = verifiedUser.id;

    // document_id/user_id used to be trusted straight from the body, letting
    // any caller overwrite another user's document (status/extracted_text/
    // ai_summary/risk_score) by naming its id. Verify ownership before any
    // writes.
    const { data: ownedDoc } = await supabase.from("documents").select("id").eq("id", document_id).eq("user_id", user_id).maybeSingle();
    if (!ownedDoc) throw new HttpError(403, "document_id does not belong to the current user");
    ownedDocumentId = document_id;

    await supabase.from("documents").update({ status: "processing" }).eq("id", document_id);

    const chunks = chunkBySentenceBoundary(text_content);
    const allEmbeddings: (number[] | null)[] = [];

    if (hfKey) {
      for (let i = 0; i < chunks.length; i += 10) {
        const batch = chunks.slice(i, i + 10);
        const embeddings = await getEmbeddings(batch, hfKey);
        allEmbeddings.push(...embeddings);
      }
    } else {
      chunks.forEach(() => allEmbeddings.push(null));
    }

    await supabase.from("document_chunks").delete().eq("document_id", document_id);

    const chunkRows = chunks.map((content, idx) => ({
      document_id,
      user_id,
      chunk_index: idx,
      content,
      embedding: allEmbeddings[idx],
    }));

    for (let i = 0; i < chunkRows.length; i += 50) {
      await supabase.from("document_chunks").insert(chunkRows.slice(i, i + 50));
    }

    const excerpt = buildRepresentativeExcerpt(text_content);
    const analysisRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{
          role: "user",
          content: `Analyse this legal document and return ONLY a valid JSON object (no markdown, no code blocks) with exactly these fields:
{
  "document_type": "string",
  "parties": ["array of party names"],
  "summary": "2-3 sentence summary",
  "risk_score": number 0-100,
  "risk_summary": "one sentence risk assessment",
  "key_provisions": ["up to 5 key provisions as short strings"],
  "key_dates": [{"label": "string", "date": "string"}],
  "issues_identified": ["up to 5 issues as short strings"]
}

Document:
${excerpt}`,
        }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    let metadata: Record<string, unknown> = { chunks_count: chunks.length };
    let aiSummary = "";
    let riskScore = 0;

    if (analysisRes.ok) {
      const analysisData = await analysisRes.json();
      const raw = analysisData.choices?.[0]?.message?.content ?? "{}";
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        aiSummary = parsed.summary ?? "";
        riskScore = Math.min(100, Math.max(0, Number(parsed.risk_score) || 0));
        metadata = {
          chunks_count: chunks.length,
          document_type: parsed.document_type,
          parties: parsed.parties,
          key_dates: parsed.key_dates,
          key_provisions: parsed.key_provisions,
          issues_identified: parsed.issues_identified,
          risk_summary: parsed.risk_summary,
        };
      } catch { /* keep defaults */ }
    }

    await supabase.from("documents").update({
      ai_summary: aiSummary,
      risk_score: riskScore,
      metadata,
      status: "ready",
      extracted_text: text_content,
    }).eq("id", document_id);

    return new Response(
      JSON.stringify({ success: true, chunks_count: chunks.length, risk_score: riskScore }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Only mark a document as errored if ownership was already confirmed
    // above — never trust an unverified id from a failed/forged request.
    if (ownedDocumentId) {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabase.from("documents").update({ status: "error" }).eq("id", ownedDocumentId);
      } catch { /* ignore */ }
    }
    return errorResponse(error, cors);
  }
});
