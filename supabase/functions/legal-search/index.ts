import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchLawsAfricaSources, COUNTRY_MAP, COUNTRY_NAMES } from "../_shared/laws-africa.ts";
import { CIMA_SYSTEM_PROMPT } from "../_shared/cima-system-prompt.ts";
import { fetchTaggedAuthorityContext } from "../_shared/tagged-authorities.ts";
import { buildStrictGroundingBlock } from "../_shared/strict-grounding.ts";
import { getEmbedding, searchLegalLibrary, searchTavily } from "../_shared/legal-retrieval.ts";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, HttpError } from "../_shared/http-error.ts";
import { requireString, optionalString, optionalUUIDArray, requireArray } from "../_shared/validate.ts";

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
    const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? "";
    const courtlistenerKey = Deno.env.get("COURTLISTENER_API_KEY") ?? "";
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceKey);

    await enforceRateLimit(supabase, verifiedUser.id, "legal-search", 20, 60);

    const body = await req.json();
    const query = requireString(body.query, "query", { maxLength: 2000 });
    const jurisdiction = optionalString(body.jurisdiction, "jurisdiction", 100);
    const source_types = body.source_types === undefined
      ? undefined
      : requireArray(body.source_types, "source_types", {
          maxItems: 10,
          itemValidator: (v) => {
            if (typeof v !== "string" || v.length > 50) throw new HttpError(400, "source_types[] must be short strings");
            return v;
          },
        });
    const library_doc_ids = optionalUUIDArray(body.library_doc_ids, "library_doc_ids");
    const document_ids = optionalUUIDArray(body.document_ids, "document_ids");
    const user_id = verifiedUser.id;

    // Strict grounding: when the user has @-tagged specific cases/legislation/
    // documents, skip Laws.Africa/vector search/CourtListener/Tavily entirely
    // and answer only from the tagged sources.
    if ((library_doc_ids?.length ?? 0) > 0 || (document_ids?.length ?? 0) > 0) {
      const tagged = await fetchTaggedAuthorityContext(supabase, user_id, library_doc_ids, document_ids, query, hfKey);
      if (tagged) {
        const groundedSources = tagged.citedSources.map((s) => ({
          id: s.doc_id ?? s.marker,
          source_name: s.source_name,
          citation: s.citation,
          source_type: s.source_type ?? "document",
          jurisdiction: s.jurisdiction,
          content: s.content,
          doc_id: s.doc_id,
        }));

        const jurisdictionLabel = COUNTRY_NAMES[COUNTRY_MAP[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh"] ?? jurisdiction ?? "Ghana";
        const synthesisPrompt = `JURISDICTION: ${jurisdictionLabel}
QUERY: ${query}

Answer the query using only the tagged authority text provided below. Cite each tagged authority using its exact marker (e.g. "[T1]") inline.${buildStrictGroundingBlock(tagged.titles, tagged.context)}`;

        const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: CIMA_SYSTEM_PROMPT },
              { role: "user", content: synthesisPrompt },
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        });

        let aiAnalysis = "";
        if (dsRes.ok) {
          const dsData = await dsRes.json();
          aiAnalysis = dsData.choices?.[0]?.message?.content ?? "";
        }

        return new Response(
          JSON.stringify({
            sources: groundedSources,
            ai_analysis: aiAnalysis,
            tavily_results: [],
            sources_count: groundedSources.length,
            cited_sources: tagged.citedSources,
          }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }

    const sources: {
      id: string;
      source_name: string;
      citation?: string;
      source_type: string;
      jurisdiction?: string;
      content: string;
      similarity?: number;
      url?: string;
      doc_id?: string;
    }[] = [];

    // Determine resolved country code for jurisdiction-aware filtering
    const resolvedCountryCode = COUNTRY_MAP[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh";
    const isAfricanJurisdiction = Object.values(COUNTRY_MAP).includes(resolvedCountryCode);
    const jurisdictionLabel = COUNTRY_NAMES[resolvedCountryCode] ?? jurisdiction ?? "Ghana";
    const effectiveSourceTypes = source_types ?? [];

    // Phase A — independent retrieval calls run concurrently instead of one
    // after another. librarySources/docChunks (Phase B below) both need the
    // same pre-computed embedding, so that's resolved here too, but nothing
    // else waits on anything else in this phase.
    const [lawsSources, queryEmbedding, courtListenerResults, tavilyResults] = await Promise.all([
      (async (): Promise<typeof sources> => {
        if (!lawsAfricaKey) return [];
        try {
          const countryCode = COUNTRY_MAP[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh";
          const results = await fetchLawsAfricaSources(query, lawsAfricaKey, countryCode);
          return results.map((s) => ({
            id: s.id,
            source_name: s.source_name,
            citation: s.citation,
            source_type: s.source_type,
            jurisdiction: s.jurisdiction,
            content: s.content,
            url: s.url,
          }));
        } catch {
          return [];
        }
      })(),
      hfKey ? getEmbedding(query, hfKey) : Promise.resolve(null),
      (async (): Promise<typeof sources> => {
        // CourtListener only indexes US courts — skip entirely for African jurisdictions
        if (isAfricanJurisdiction || !courtlistenerKey) return [];
        if (!(effectiveSourceTypes.length === 0 || effectiveSourceTypes.includes("case"))) return [];
        try {
          const clRes = await fetch(
            `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=o&format=json&page_size=3`,
            { headers: { "Authorization": `Token ${courtlistenerKey}` } }
          );
          if (!clRes.ok) return [];
          const clData = await clRes.json();
          return (clData.results ?? []).slice(0, 3).map((item: { id: string; caseName?: string; citation?: string[]; dateFiled?: string; snippet?: string; description?: string; absolute_url?: string }) => ({
            id: `cl-${item.id}`,
            source_name: item.caseName ?? "CourtListener Case",
            citation: item.citation?.[0] ?? item.dateFiled ?? "",
            source_type: "case",
            jurisdiction: "international",
            content: item.snippet ?? item.description ?? "",
            url: `https://www.courtlistener.com${item.absolute_url ?? ""}`,
          }));
        } catch {
          return [];
        }
      })(),
      searchTavily(query, jurisdiction, tavilyKey),
    ]);

    // Phase B — depends on queryEmbedding from Phase A, but the two calls
    // here are independent of each other.
    const [librarySources, docChunksResult] = await Promise.all([
      searchLegalLibrary(query, supabase, {
        embedding: queryEmbedding,
        jurisdiction: jurisdiction || undefined,
        sourceType: source_types?.[0] || undefined,
        matchCount: 6,
      }),
      (queryEmbedding && user_id)
        ? supabase.rpc("match_document_chunks", {
            query_embedding: queryEmbedding,
            match_count: 3,
            filter_user_id: user_id,
          })
        : Promise.resolve({ data: null }),
    ]);

    sources.push(...librarySources);
    for (const r of (docChunksResult.data ?? [])) {
      sources.push({
        id: r.id,
        source_name: `Document: ${r.document_name ?? "Uploaded Document"}`,
        source_type: "document",
        content: r.content,
        similarity: r.similarity,
      });
    }
    sources.push(...courtListenerResults);

    // Laws.Africa legislation always appears first; fill remaining slots with other sources
    const allSources = [...lawsSources, ...sources];

    // Fix 3: For African jurisdictions, exclude case-law sources from non-matching jurisdictions
    // before building the AI context (keeps Laws.Africa + local library + document chunks)
    const AFRICAN_CODES = new Set(Object.values(COUNTRY_MAP));
    const relevantSources = isAfricanJurisdiction
      ? sources.filter((s) => {
          if (s.source_type === "case" && s.jurisdiction) {
            const j = s.jurisdiction.toLowerCase();
            // Keep only if jurisdiction matches or is directly applicable international law
            return j === resolvedCountryCode || j === "international" && false;
          }
          return true; // keep statutes, documents, rules
        })
      : sources;

    // Suppress the unused variable warning
    void AFRICAN_CODES;

    const legislationBlock = lawsSources.length > 0
      ? `\n\nPrimary Legislation (Laws.Africa):\n${lawsSources
          .map((s, i) => `[L${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}${s.url ? `\nSource: ${s.url}` : ""}:\n${s.content.slice(0, 1000)}`)
          .join("\n\n")}`
      : "";

    const cappedOtherSources = relevantSources.slice(0, 8);
    const otherSourcesBlock = cappedOtherSources.length > 0
      ? `\n\nAdditional Sources:\n${cappedOtherSources
          .map((s, i) => `[${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}:\n${s.content.slice(0, 600)}`)
          .join("\n\n")}`
      : "";

    // Mirrors the exact numbering used in legislationBlock/otherSourcesBlock above
    // so [L1]/[1] markers in ai_analysis can be resolved back to a real source.
    const citedSources = [
      ...lawsSources.map((s, i) => ({
        marker: `L${i + 1}`,
        source_name: s.source_name,
        citation: s.citation,
        source_type: s.source_type,
        jurisdiction: s.jurisdiction,
        content: s.content,
        url: s.url,
      })),
      ...cappedOtherSources.map((s, i) => ({
        marker: `${i + 1}`,
        source_name: s.source_name,
        citation: s.citation,
        source_type: s.source_type,
        jurisdiction: s.jurisdiction,
        content: s.content,
        url: s.url,
        doc_id: s.doc_id,
      })),
    ];

    // Fix 2: Jurisdiction-aware synthesis prompt that explicitly instructs the AI
    // to discard off-jurisdiction sources and fall back to training knowledge if needed
    const synthesisPrompt = (legislationBlock || otherSourcesBlock)
      ? `JURISDICTION: ${jurisdictionLabel}
QUERY: ${query}

INSTRUCTIONS:
- Only cite sources that are directly relevant to the query AND the jurisdiction above
- If a source is from a different jurisdiction (e.g., a US court case when the jurisdiction is ${jurisdictionLabel}), explicitly state it is not applicable and do NOT base your analysis on it
- Laws.Africa legislation sources (marked [L1], [L2] etc.) are primary authority — prioritise these
- If no retrieved sources are relevant, still provide a comprehensive analysis based on your training knowledge of ${jurisdictionLabel} law, and clearly state you are drawing on general legal knowledge
- Structure your response with clear headers
- Cite legislation by [L1], [L2] etc. and other sources by [1], [2] etc. — only when actually relevant${legislationBlock}${otherSourcesBlock}`
      : `JURISDICTION: ${jurisdictionLabel}
QUERY: ${query}

No external sources were retrieved for this query. Provide a comprehensive legal analysis based on your training knowledge of ${jurisdictionLabel} law. Clearly indicate that you are drawing on general legal knowledge. Structure your response with clear headers and cite any specific legislation or case law from your training where relevant.`;

    const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: CIMA_SYSTEM_PROMPT + `\n\nDETECTED JURISDICTION: ${jurisdictionLabel}`,
          },
          { role: "user", content: synthesisPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    let aiAnalysis = "";
    if (dsRes.ok) {
      const dsData = await dsRes.json();
      aiAnalysis = dsData.choices?.[0]?.message?.content ?? "";
    }

    return new Response(
      JSON.stringify({
        sources: allSources,
        ai_analysis: aiAnalysis,
        tavily_results: tavilyResults,
        sources_count: allSources.length,
        cited_sources: citedSources,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return errorResponse(error, cors);
  }
});
