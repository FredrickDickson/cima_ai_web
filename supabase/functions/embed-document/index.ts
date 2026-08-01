import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthedUserId, billingErrorResponse } from "../_shared/billing.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getEmbeddings(texts: string[], hfKey: string): Promise<(number[] | null)[]> {
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
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

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return chunks;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let ownershipVerified = false;

  try {
    const { document_id, text_content } = await req.json();
    if (!document_id || !text_content) {
      throw new Error("document_id and text_content are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Runs on the service-role client, which bypasses RLS — without an
    // explicit auth check + ownership verification here, anyone holding the
    // public anon key (shipped to every browser) could overwrite any user's
    // document chunks/summary/status just by naming a document_id.
    const user_id = await getAuthedUserId(req);
    await rateLimit(supabase, `embed-document:${user_id}`, { limit: 20, windowSeconds: 60 });
    const { data: owned } = await supabase
      .from("documents")
      .select("id")
      .eq("id", document_id)
      .eq("user_id", user_id)
      .maybeSingle();
    if (!owned) throw new Error("Document not found");
    ownershipVerified = true;

    await supabase.from("documents").update({ status: "processing" }).eq("id", document_id);

    const chunks = chunkText(text_content);
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

    const excerpt = text_content.slice(0, 6000);
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
      extracted_text: text_content.slice(0, 100000),
    }).eq("id", document_id);

    return new Response(
      JSON.stringify({ success: true, chunks_count: chunks.length, risk_score: riskScore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const billingResp = billingErrorResponse(error, corsHeaders);
    if (billingResp) return billingResp;

    if (ownershipVerified) {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const body = await (req.clone()).json().catch(() => ({}));
        if (body.document_id) {
          await supabase.from("documents").update({ status: "error" }).eq("id", body.document_id);
        }
      } catch { /* ignore */ }
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
