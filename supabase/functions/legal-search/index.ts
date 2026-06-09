import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchLawsAfricaSources, COUNTRY_MAP } from "../_shared/laws-africa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getEmbedding(text: string, hfKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data[0]) ? data[0] : data;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, jurisdiction, source_types, user_id } = await req.json();
    if (!query) throw new Error("query is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? "";
    const courtlistenerKey = Deno.env.get("COURTLISTENER_API_KEY") ?? "";
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceKey);

    const sources: {
      id: string;
      source_name: string;
      citation?: string;
      source_type: string;
      jurisdiction?: string;
      content: string;
      similarity?: number;
      url?: string;
    }[] = [];

    // Fetch Laws.Africa legislation first — guaranteed slots in AI context
    const lawsSources: typeof sources = [];
    if (lawsAfricaKey) {
      try {
        const countryCode = COUNTRY_MAP[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh";
        const results = await fetchLawsAfricaSources(query, lawsAfricaKey, countryCode);
        for (const s of results) {
          lawsSources.push({
            id: s.id,
            source_name: s.source_name,
            citation: s.citation,
            source_type: s.source_type,
            jurisdiction: s.jurisdiction,
            content: s.content,
            url: s.url,
          });
        }
      } catch { /* non-fatal */ }
    }

    const queryEmbedding = hfKey ? await getEmbedding(query, hfKey) : null;

    if (queryEmbedding) {
      const { data: libResults } = await supabase.rpc("match_legal_library", {
        query_embedding: queryEmbedding,
        match_count: 6,
        filter_jurisdiction: jurisdiction || null,
        filter_source_type: source_types?.[0] || null,
      });
      for (const r of (libResults ?? [])) {
        sources.push({
          id: r.id,
          source_name: r.title,
          citation: r.citation,
          source_type: r.source_type,
          jurisdiction: r.jurisdiction,
          content: r.content,
          similarity: r.similarity,
        });
      }

      if (user_id) {
        const { data: docChunks } = await supabase.rpc("match_document_chunks", {
          query_embedding: queryEmbedding,
          match_count: 3,
          filter_user_id: user_id,
        });
        for (const r of (docChunks ?? [])) {
          sources.push({
            id: r.id,
            source_name: `Document: ${r.document_name ?? "Uploaded Document"}`,
            source_type: "document",
            content: r.content,
            similarity: r.similarity,
          });
        }
      }
    }

    if (sources.length === 0) {
      const { data: ftsResults } = await supabase.rpc("search_legal_library_fts", {
        search_query: query,
        match_count: 5,
      });
      for (const r of (ftsResults ?? [])) {
        sources.push({
          id: r.id,
          source_name: r.title,
          citation: r.citation,
          source_type: r.source_type,
          jurisdiction: r.jurisdiction,
          content: r.content,
        });
      }
    }

    const effectiveSourceTypes = source_types ?? [];
    if (courtlistenerKey && (effectiveSourceTypes.length === 0 || effectiveSourceTypes.includes("case"))) {
      try {
        const clRes = await fetch(
          `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=o&format=json&page_size=3`,
          { headers: { "Authorization": `Token ${courtlistenerKey}` } }
        );
        if (clRes.ok) {
          const clData = await clRes.json();
          for (const item of (clData.results ?? []).slice(0, 3)) {
            sources.push({
              id: `cl-${item.id}`,
              source_name: item.caseName ?? "CourtListener Case",
              citation: item.citation?.[0] ?? item.dateFiled ?? "",
              source_type: "case",
              jurisdiction: "international",
              content: item.snippet ?? item.description ?? "",
              url: `https://www.courtlistener.com${item.absolute_url ?? ""}`,
            });
          }
        }
      } catch { /* non-fatal */ }
    }

    let tavilyResults: { title: string; url: string; content: string; score: number }[] = [];
    if (tavilyKey) {
      try {
        const tvRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `legal: ${query}${jurisdiction ? ` ${jurisdiction}` : ""}`,
            search_depth: "advanced",
            max_results: 5,
            include_domains: [
              "lawsghana.com", "ghanaweb.com", "ghanalegal.com",
              "uncitral.un.org", "iccwbo.org", "lcia.org",
              "lawfareblog.com", "kluwerlawonline.com", "italaw.com",
              "globalarbitrationreview.com",
            ],
          }),
        });
        if (tvRes.ok) {
          const tvData = await tvRes.json();
          tavilyResults = (tvData.results ?? []).map((r: { title: string; url: string; content: string; score: number }) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score ?? 0,
          }));
        }
      } catch { /* non-fatal */ }
    }

    // Laws.Africa legislation always appears first; fill remaining slots with other sources
    const allSources = [...lawsSources, ...sources];
    const contextSources = allSources.slice(0, 10);

    const legislationBlock = lawsSources.length > 0
      ? `\n\nPrimary Legislation (Laws.Africa):\n${lawsSources
          .map((s, i) => `[L${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}${s.url ? `\nSource: ${s.url}` : ""}:\n${s.content.slice(0, 1000)}`)
          .join("\n\n")}`
      : "";

    const otherSourcesBlock = sources.length > 0
      ? `\n\nAdditional Sources:\n${sources
          .slice(0, 8)
          .map((s, i) => `[${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}:\n${s.content.slice(0, 600)}`)
          .join("\n\n")}`
      : "";

    const synthesisPrompt = (legislationBlock || otherSourcesBlock)
      ? `You are CIMA AI, an expert legal intelligence assistant specialised in African law, international commercial arbitration, and comparative law. Using the sources below, provide a comprehensive, well-structured legal analysis. Cite legislation by [L1], [L2] etc. and other sources by [1], [2] etc.${legislationBlock}${otherSourcesBlock}\n\nQuery: ${query}${jurisdiction ? `\nJurisdiction: ${jurisdiction}` : ""}`
      : `You are CIMA AI, an expert legal intelligence assistant specialised in African law and international commercial arbitration. Provide a comprehensive legal analysis of: ${query}${jurisdiction ? `\nJurisdiction: ${jurisdiction}` : ""}`;

    // Keep contextSources for the response (used by frontend to display sources panel)
    void contextSources;

    const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: synthesisPrompt }],
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
      JSON.stringify({ sources: allSources, ai_analysis: aiAnalysis, tavily_results: tavilyResults, sources_count: allSources.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
