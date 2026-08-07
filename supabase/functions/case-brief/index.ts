// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CHARS = 45000;

const EMPTY_BRIEF = {
  area_of_law: "",
  facts: "",
  issues: [],
  holding: "",
  procedural_history: "",
  principles: [],
  concurrences_dissents: [],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { doc_id, force_regenerate } = await req.json();
    if (!doc_id) throw new Error("doc_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from("case_briefs")
        .select("*")
        .eq("doc_id", doc_id)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ brief: existing, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: docRow, error: docError } = await supabase.rpc("get_legal_library_document", { doc_id });
    const doc = Array.isArray(docRow) ? docRow[0] : docRow;
    if (docError || !doc) throw new Error("Document not found");
    if (doc.source_type !== "case") throw new Error("Case briefs are only available for case documents");

    const chunks = (doc.chunks ?? []) as { chunk_index: number | null; content: string }[];
    if (chunks.length === 0) throw new Error("Document has no extracted text to brief");

    let fullText = chunks
      .slice()
      .sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0))
      .map((c) => c.content)
      .join("\n\n");
    if (fullText.length > MAX_CHARS) {
      fullText = fullText.slice(0, MAX_CHARS) + "\n\n[... document truncated for length ...]";
    }

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a legal case-briefing assistant. Read the full judgment text provided and produce a structured brief using ONLY the facts, reasoning, and holdings stated in that text. Do not add outside knowledge about the case. Respond with strict JSON only — no markdown fences, no commentary before or after the JSON object.",
          },
          {
            role: "user",
            content: `CASE: ${doc.title} (${doc.citation || "no citation on file"})
COURT: ${doc.court || "unknown"}
YEAR: ${doc.decided_year || "unknown"}

FULL JUDGMENT TEXT:
${fullText}

Produce a JSON object with exactly this shape:
{
  "area_of_law": "concise classification of the area(s) of law this case concerns, deduced from the judgment text (e.g. 'Contract Law', 'Arbitration & ADR', 'Tort Law — Negligence', 'Constitutional Law', 'Employment Law', 'Land Law'). Give the most specific applicable label. Only join multiple labels with ' / ' if the case genuinely spans distinct areas — do not pad this with extra categories.",
  "facts": "2-4 paragraph summary of the material facts as found by the court",
  "issues": ["issue 1 framed as a question", "issue 2"],
  "holding": "1-2 paragraph statement of what the court actually decided and the order made",
  "procedural_history": "how the matter reached this court (trial court outcome, grounds of appeal, etc.) — state 'Not stated in the judgment text' if the text is silent on this",
  "principles": ["principle of law established or applied, stated as a standalone rule"],
  "concurrences_dissents": [
    { "judge": "name if given, else 'Unnamed'", "type": "concurrence|dissent", "summary": "1-2 sentences" }
  ]
}

If there are no concurring or dissenting opinions in the text, return an empty array for concurrences_dissents. If a section genuinely cannot be determined from the text, say so explicitly inside that field's string rather than inventing content.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) throw new Error(`AI service error: ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown> = {};
    let parseStatus: "ok" | "partial" | "failed" = "ok";
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error("No JSON object found in response");
      }
      const missingKey = Object.keys(EMPTY_BRIEF).some((k) => !(k in parsed));
      if (missingKey) parseStatus = "partial";
    } catch {
      parsed = {};
      parseStatus = "failed";
    }

    const brief = {
      doc_id,
      area_of_law: String(parsed.area_of_law ?? EMPTY_BRIEF.area_of_law),
      facts: String(parsed.facts ?? EMPTY_BRIEF.facts),
      issues: Array.isArray(parsed.issues) ? parsed.issues : EMPTY_BRIEF.issues,
      holding: String(parsed.holding ?? EMPTY_BRIEF.holding),
      procedural_history: String(parsed.procedural_history ?? EMPTY_BRIEF.procedural_history),
      principles: Array.isArray(parsed.principles) ? parsed.principles : EMPTY_BRIEF.principles,
      concurrences_dissents: Array.isArray(parsed.concurrences_dissents)
        ? parsed.concurrences_dissents
        : EMPTY_BRIEF.concurrences_dissents,
      raw_model_output: raw,
      parse_status: parseStatus,
      model: "deepseek-chat",
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await supabase
      .from("case_briefs")
      .upsert(brief, { onConflict: "doc_id" })
      .select()
      .maybeSingle();
    if (saveError) throw new Error(`Failed to save brief: ${saveError.message}`);

    return new Response(JSON.stringify({ brief: saved, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
