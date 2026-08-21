// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/http-error.ts";
import { requireUUID } from "../_shared/validate.ts";
import { getEmbedding } from "../_shared/legal-retrieval.ts";

const MAX_CANDIDATES = 15;
const TREATMENTS = ["followed", "applied", "distinguished", "disapproved", "overruled", "mentioned"];
const CONFIDENCES = ["low", "medium", "high"];

interface MatchRow {
  id: string;
  content: string;
  doc_id: string | null;
}

interface Candidate {
  citing_doc_id: string;
  citing_title: string;
  citing_citation: string;
  matched_chunks: { chunk_id: string; content: string }[];
  score: number;
}

async function classifyCandidate(
  cited: { title: string; citation: string },
  candidate: Candidate,
  deepseekKey: string,
): Promise<{ treatment: string; confidence: string; snippet: string; reasoning: string } | null> {
  const passages = candidate.matched_chunks
    .slice(0, 3)
    .map((c, i) => `[Passage ${i + 1}]\n${c.content.slice(0, 2000)}`)
    .join("\n\n");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a legal citation-treatment classifier. You are given passages from one judgment (the CITING case) that appear to mention or discuss another judgment (the CITED case). Decide, using ONLY the text provided — never your own outside knowledge of these cases — how the citing case treats the cited case. Respond with strict JSON only, no prose, no markdown fences.",
        },
        {
          role: "user",
          content: `CITED CASE: ${cited.title} (${cited.citation})

CITING CASE: ${candidate.citing_title} (${candidate.citing_citation})

PASSAGES FROM THE CITING CASE THAT MENTION THE CITED CASE:
${passages}

Classify the treatment as exactly one of:
- "followed": citing case applies the cited case's ratio as binding/persuasive and reaches a consistent result
- "applied": citing case applies the specific rule/test from the cited case to its own facts
- "distinguished": citing case declines to apply the cited case because the facts/law differ
- "disapproved": citing case criticizes or casts doubt on the cited case's reasoning without formally overruling it
- "overruled": citing case expressly overrules, reverses on appeal, or holds the cited case wrongly decided
- "mentioned": cited case is referenced but the passages show no clear substantive engagement (e.g. a bare citation list, "see also", passing reference)

If the passages do not show enough context to decide confidently, use "mentioned" and set confidence to "low".

Return JSON exactly matching this shape:
{
  "treatment": "followed|applied|distinguished|disapproved|overruled|mentioned",
  "confidence": "low|medium|high",
  "snippet": "the single most relevant verbatim quote (<= 300 chars) from the passages above that justifies this classification",
  "reasoning": "one sentence explaining the classification, referencing only the passages given"
}`,
        },
      ],
      temperature: 0,
      max_tokens: 400,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      parsed = JSON.parse(match[0]);
    }
    const treatment = String(parsed.treatment ?? "");
    const confidence = String(parsed.confidence ?? "");
    if (!TREATMENTS.includes(treatment) || !CONFIDENCES.includes(confidence)) return null;
    return {
      treatment,
      confidence,
      snippet: String(parsed.snippet ?? "").slice(0, 500),
      reasoning: String(parsed.reasoning ?? "").slice(0, 1000),
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const verifiedUser = await requireUser(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // This is the most expensive endpoint in the app (up to 15 DeepSeek
    // calls per request) — a tight limit specifically here in addition to
    // the shared per-endpoint rate limiting below.
    await enforceRateLimit(supabase, verifiedUser.id, "case-citator", 3, 60);

    const body = await req.json();
    const doc_id = requireUUID(body.doc_id, "doc_id");
    const force_refresh = body.force_refresh === true;

    const { data: cited, error: citedError } = await supabase
      .from("legal_library_documents")
      .select("id, title, citation, parties, decided_year, source_type")
      .eq("id", doc_id)
      .maybeSingle();
    if (citedError || !cited) throw new Error("Document not found");
    if (cited.source_type !== "case") throw new Error("Smart Citator is only available for case documents");

    // Return the most recent cached run unless a fresh analysis was explicitly requested.
    if (!force_refresh) {
      const { data: existingRun } = await supabase
        .from("case_citator_runs")
        .select("*")
        .eq("cited_doc_id", doc_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingRun) {
        const { data: citations } = await supabase
          .from("case_citations")
          .select("*")
          .eq("cited_doc_id", doc_id)
          .order("created_at", { ascending: false });
        return new Response(JSON.stringify({ run: existingRun, citations: citations ?? [] }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const { count: corpusDocCount } = await supabase
      .from("legal_library_documents")
      .select("id", { count: "exact", head: true })
      .eq("source_type", "case");

    const parties = (cited.parties ?? []) as { role: string; name: string }[];
    const identity = `${cited.citation ?? ""} ${parties.map((p) => p.name).join(" ")}`.trim() || cited.title;

    const matchRows: MatchRow[] = [];
    const { data: ftsResults } = await supabase.rpc("search_legal_library_fts", {
      search_query: identity,
      match_count: 40,
    });
    for (const r of ftsResults ?? []) {
      matchRows.push({ id: r.id, content: r.content, doc_id: r.doc_id ?? null });
    }

    const embedding = hfKey ? await getEmbedding(identity, hfKey) : null;
    if (embedding) {
      const { data: vectorResults } = await supabase.rpc("match_legal_library", {
        query_embedding: embedding,
        match_count: 40,
        filter_jurisdiction: null,
        filter_source_type: "case",
        filter_doc_id: null,
      });
      for (const r of vectorResults ?? []) {
        matchRows.push({ id: r.id, content: r.content, doc_id: r.doc_id ?? null });
      }
    }

    // Group matched chunks by citing document, excluding the cited case itself
    // and chunks with no resolved parent document.
    const byDoc = new Map<string, { chunk_id: string; content: string }[]>();
    for (const row of matchRows) {
      if (!row.doc_id || row.doc_id === doc_id) continue;
      const list = byDoc.get(row.doc_id) ?? [];
      if (list.length < 3 && !list.some((c) => c.chunk_id === row.id)) {
        list.push({ chunk_id: row.id, content: row.content });
      }
      byDoc.set(row.doc_id, list);
    }

    const candidatesScreened = byDoc.size;

    let candidateDocs: Candidate[] = [];
    if (byDoc.size > 0) {
      const { data: citingDocs } = await supabase
        .from("legal_library_documents")
        .select("id, title, citation, decided_year, source_type")
        .in("id", Array.from(byDoc.keys()));

      for (const d of citingDocs ?? []) {
        if (d.source_type !== "case") continue;
        // A case cannot meaningfully "treat" a case decided after it.
        if (cited.decided_year && d.decided_year && d.decided_year < cited.decided_year) continue;
        const matched_chunks = byDoc.get(d.id) ?? [];
        candidateDocs.push({
          citing_doc_id: d.id,
          citing_title: d.title,
          citing_citation: d.citation ?? "",
          matched_chunks,
          score: matched_chunks.length,
        });
      }
    }

    candidateDocs.sort((a, b) => b.score - a.score);
    candidateDocs = candidateDocs.slice(0, MAX_CANDIDATES);

    // Classify candidates in small parallel batches to bound wall-clock time.
    const classified: { candidate: Candidate; verdict: NonNullable<Awaited<ReturnType<typeof classifyCandidate>>> }[] = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < candidateDocs.length; i += BATCH_SIZE) {
      const batch = candidateDocs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((c) => classifyCandidate({ title: cited.title, citation: cited.citation ?? "" }, c, deepseekKey)),
      );
      results.forEach((verdict, idx) => {
        if (verdict) classified.push({ candidate: batch[idx], verdict });
      });
    }

    const { data: run, error: runError } = await supabase
      .from("case_citator_runs")
      .insert({
        cited_doc_id: doc_id,
        candidates_screened: candidatesScreened,
        treatments_found: classified.length,
        corpus_doc_count: corpusDocCount ?? 0,
        status: "completed",
      })
      .select()
      .single();
    if (runError || !run) throw new Error(`Failed to record citator run: ${runError?.message}`);

    for (const { candidate, verdict } of classified) {
      await supabase.from("case_citations").upsert(
        {
          cited_doc_id: doc_id,
          citing_doc_id: candidate.citing_doc_id,
          treatment: verdict.treatment,
          context_snippet: verdict.snippet,
          citing_chunk_id: candidate.matched_chunks[0]?.chunk_id ?? null,
          reasoning: verdict.reasoning,
          confidence: verdict.confidence,
          model: "deepseek-chat",
          analysis_run_id: run.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cited_doc_id,citing_doc_id" },
      );
    }

    // Retire citations from prior runs that didn't resurface in this analysis.
    await supabase
      .from("case_citations")
      .delete()
      .eq("cited_doc_id", doc_id)
      .neq("analysis_run_id", run.id);

    const { data: citations } = await supabase
      .from("case_citations")
      .select("*")
      .eq("cited_doc_id", doc_id)
      .order("created_at", { ascending: false });

    return new Response(JSON.stringify({ run, citations: citations ?? [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error, cors);
  }
});
