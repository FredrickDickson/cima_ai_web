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
  // Documents ingested after Supabase's free tier filled up live in Convex
  // instead (see the Legal Library / Convex migration) — tags which backend
  // a hit came from so the client knows where to route the "view document"
  // link (defaults to "supabase" for callers that don't set it, e.g. Laws.Africa/
  // CourtListener/document-chunk sources further down legal-search/index.ts).
  source?: "supabase" | "convex";
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
      "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5/pipeline/feature-extraction",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      },
    );
    if (!res.ok) {
      console.error(`getEmbedding: HuggingFace request failed (${res.status})`, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return Array.isArray(data[0]) ? data[0] : data;
  } catch (err) {
    console.error("getEmbedding: request threw", err);
    return null;
  }
}

/** Batch variant of getEmbedding — one HuggingFace call for multiple chunks. */
export async function getEmbeddings(texts: string[], hfKey: string): Promise<(number[] | null)[]> {
  if (!hfKey) return texts.map(() => null);
  try {
    const res = await fetch(
      "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5/pipeline/feature-extraction",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      },
    );
    if (!res.ok) {
      console.error(`getEmbeddings: HuggingFace request failed (${res.status})`, await res.text().catch(() => ""));
      return texts.map(() => null);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error("getEmbeddings: unexpected HuggingFace response shape", JSON.stringify(data).slice(0, 500));
    }
    return Array.isArray(data) ? data : texts.map(() => null);
  } catch (err) {
    console.error("getEmbeddings: request threw", err);
    return texts.map(() => null);
  }
}

/**
 * Vector search over Convex's `libraryChunks` (documents ingested after
 * Supabase's free tier filled up — see the Legal Library / Convex migration)
 * via its `/searchLibrary` HTTP action, which internally does the same
 * vector-then-FTS-fallback as the Supabase RPCs below. Fails soft (returns
 * `[]`) on any error/timeout/missing config — a Convex outage must never
 * break Supabase-backed search.
 */
async function searchConvexLibrary(
  query: string,
  embedding: number[] | null | undefined,
  opts: { jurisdiction?: string; sourceType?: string; matchCount?: number },
): Promise<RetrievedLibrarySource[]> {
  const convexSiteUrl = Deno.env.get("CONVEX_SITE_URL");
  if (!convexSiteUrl) return [];
  try {
    const res = await fetch(`${convexSiteUrl}/searchLibrary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        embedding: embedding ?? undefined,
        jurisdiction: opts.jurisdiction,
        sourceType: opts.sourceType,
        matchCount: opts.matchCount ?? 6,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((r: RetrievedLibrarySource) => ({
      ...r,
      source: "convex" as const,
    }));
  } catch {
    return [];
  }
}

/**
 * Vector search over `legal_library` via `match_legal_library`, falling back
 * to `search_legal_library_fts` when no embedding is available/succeeds or
 * the vector search returns nothing. Pass a pre-computed `embedding` when the
 * caller already needs one for another RPC too (e.g. legal-search also
 * reuses it for `match_document_chunks`) — otherwise pass `hfKey` and one
 * will be computed here. Merges in Convex-hosted results (see
 * searchConvexLibrary above) so this one function stays the single retrieval
 * brain for all three consumers (legal-search's AI Search, Research.tsx,
 * ai-chat's research-mode grounding) regardless of which backend a document
 * ended up in.
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
        source: "supabase",
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
        source: "supabase",
      });
    }
  }

  const convexResults = await searchConvexLibrary(query, embedding, {
    jurisdiction: opts.jurisdiction,
    sourceType: opts.sourceType,
    matchCount,
  });

  return [...results, ...convexResults]
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, matchCount);
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
