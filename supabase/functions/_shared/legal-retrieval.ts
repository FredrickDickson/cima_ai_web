/**
 * Shared legal-library + web retrieval used by `legal-search` (the standalone
 * Research page) and `ai-chat` (Research mode in AI Assistant), so both
 * surfaces search the same case-law/statute corpus and web sources instead
 * of ai-chat improvising a thinner version.
 */

export interface RetrievedLibrarySource {
  id: string;
  source_name: string;
  citation?: string;
  source_type: string;
  jurisdiction?: string;
  content: string;
  similarity?: number;
  doc_id?: string;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function getEmbedding(text: string, hfKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data[0]) ? data[0] : data;
  } catch {
    return null;
  }
}

/**
 * Vector search over `legal_library` via `match_legal_library`, falling back
 * to `search_legal_library_fts` when no embedding is available/succeeds or
 * the vector search returns nothing. Pass a pre-computed `embedding` when the
 * caller already needs one for another RPC too (e.g. legal-search also
 * reuses it for `match_document_chunks`) — otherwise pass `hfKey` and one
 * will be computed here.
 */
export async function searchLegalLibrary(
  query: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  opts: {
    embedding?: number[] | null;
    hfKey?: string;
    jurisdiction?: string;
    sourceType?: string;
    matchCount?: number;
  } = {},
): Promise<RetrievedLibrarySource[]> {
  const matchCount = opts.matchCount ?? 6;
  const embedding = opts.embedding !== undefined
    ? opts.embedding
    : (opts.hfKey ? await getEmbedding(query, opts.hfKey) : null);

  const results: RetrievedLibrarySource[] = [];

  if (embedding) {
    const { data } = await supabase.rpc("match_legal_library", {
      query_embedding: embedding,
      match_count: matchCount,
      filter_jurisdiction: opts.jurisdiction || null,
      filter_source_type: opts.sourceType || null,
    });
    for (const r of (data ?? [])) {
      results.push({
        id: r.id,
        source_name: r.title,
        citation: r.citation,
        source_type: r.source_type,
        jurisdiction: r.jurisdiction,
        content: r.content,
        similarity: r.similarity,
        doc_id: r.doc_id ?? undefined,
      });
    }
  }

  if (results.length === 0) {
    const { data } = await supabase.rpc("search_legal_library_fts", {
      search_query: query,
      match_count: matchCount,
    });
    for (const r of (data ?? [])) {
      results.push({
        id: r.id,
        source_name: r.title,
        citation: r.citation,
        source_type: r.source_type,
        jurisdiction: r.jurisdiction,
        content: r.content,
        doc_id: r.doc_id ?? undefined,
      });
    }
  }

  return results;
}

const TAVILY_LEGAL_DOMAINS = [
  "lawsghana.com", "ghanaweb.com", "ghanalegal.com",
  "uncitral.un.org", "iccwbo.org", "lcia.org",
  "lawfareblog.com", "kluwerlawonline.com", "italaw.com",
  "globalarbitrationreview.com",
];

export async function searchTavily(query: string, jurisdiction: string | undefined, tavilyKey: string): Promise<TavilyResult[]> {
  if (!tavilyKey) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `legal: ${query}${jurisdiction ? ` ${jurisdiction}` : ""}`,
        search_depth: "advanced",
        max_results: 5,
        include_domains: TAVILY_LEGAL_DOMAINS,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((r: { title: string; url: string; content: string; score: number }) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score ?? 0,
    }));
  } catch {
    return [];
  }
}
