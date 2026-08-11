/**
 * Shared legal-library + web retrieval used by `legal-search` (the standalone
 * Research page) and `ai-chat` (Research mode in AI Assistant), so both
 * surfaces search the same case-law/statute corpus and web sources instead
 * of ai-chat improvising a thinner version.
 */

import { reciprocalRankFusion } from "./rrf.ts";
import { rerank } from "./rerank.ts";

// How many candidates to pull per source before fusing/reranking down to the
// caller's requested matchCount — "retrieve wide, then narrow" (retrieve ~20,
// rerank, keep 5-8) is the standard production pattern: fusion and reranking
// both work better with more candidates to choose from than the final count.
const CANDIDATE_POOL = 20;

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
      "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5",
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

/**
 * Hybrid search over Convex's `libraryChunks` (documents ingested after
 * Supabase's free tier filled up — see the Legal Library / Convex migration)
 * via its `/searchLibrary` HTTP action, which internally runs the same
 * vector+FTS-then-RRF-fuse hybrid as the Supabase path below (see
 * convex/http.ts). Fails soft (returns `[]`) on any error/timeout/missing
 * config — a Convex outage must never break Supabase-backed search.
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
 * Hybrid search over `legal_library` (+ Convex `libraryChunks`): runs vector
 * search (`match_legal_library`) and keyword search (`search_legal_library_fts`)
 * CONCURRENTLY — not "vector, and only fall back to keyword if vector found
 * literally nothing" (the old behavior here) — then fuses all three ranked
 * lists (Supabase-vector, Supabase-FTS, Convex) with Reciprocal Rank Fusion
 * and reranks the fused candidates with a cross-encoder before returning the
 * caller's requested count. A query can be a strong keyword match (exact
 * citation, case name) and a weak vector match, or vice versa, at once —
 * trying only one signal misses whichever half wasn't tried, which is what
 * let a query like "Standard for interim measures in ICC arbitration" return
 * nothing until 20260807000000_fts_or_fallback.sql patched the FTS fallback
 * specifically; this hybridization is the deeper fix that migration worked
 * around at the SQL layer.
 *
 * Pass a pre-computed `embedding` when the caller already needs one for
 * another RPC too (e.g. legal-search also reuses it for
 * `match_document_chunks`) — otherwise pass `hfKey` and one will be computed
 * here. Always pass `hfKey` even when passing a pre-computed `embedding`, so
 * reranking (which needs the key independently of the embedding) still runs.
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
  const poolSize = Math.max(matchCount, CANDIDATE_POOL);
  const embedding = opts.embedding !== undefined
    ? opts.embedding
    : (opts.hfKey ? await getEmbedding(query, opts.hfKey) : null);

  const [vectorResults, ftsResults, convexResults] = await Promise.all([
    embedding
      ? supabase.rpc("match_legal_library", {
        query_embedding: embedding,
        match_count: poolSize,
        filter_jurisdiction: opts.jurisdiction || null,
        filter_source_type: opts.sourceType || null,
      }).then(({ data }: { data: Record<string, unknown>[] | null }) =>
        (data ?? []).map((r): RetrievedLibrarySource => ({
          id: r.id as string,
          source_name: r.title as string,
          citation: r.citation as string | undefined,
          source_type: r.source_type as string,
          jurisdiction: r.jurisdiction as string | undefined,
          content: r.content as string,
          similarity: r.similarity as number | undefined,
          doc_id: (r.doc_id as string | undefined) ?? undefined,
          source: "supabase",
        }))
      )
      : Promise.resolve([] as RetrievedLibrarySource[]),
    supabase.rpc("search_legal_library_fts", {
      search_query: query,
      match_count: poolSize,
    }).then(({ data }: { data: Record<string, unknown>[] | null }) =>
      (data ?? []).map((r): RetrievedLibrarySource => ({
        id: r.id as string,
        source_name: r.title as string,
        citation: r.citation as string | undefined,
        source_type: r.source_type as string,
        jurisdiction: r.jurisdiction as string | undefined,
        content: r.content as string,
        doc_id: (r.doc_id as string | undefined) ?? undefined,
        source: "supabase",
      }))
    ),
    searchConvexLibrary(query, embedding, {
      jurisdiction: opts.jurisdiction,
      sourceType: opts.sourceType,
      matchCount: poolSize,
    }),
  ]);

  // Rank-based fusion, not raw-score sort — vector similarity and FTS
  // ts_rank aren't comparable numbers, and now that both run on every query
  // (not just one as a fallback), this is the only sound way to combine them.
  const fused = reciprocalRankFusion<RetrievedLibrarySource>([vectorResults, ftsResults, convexResults]);
  const candidates = fused.slice(0, poolSize);

  const finalOrder = opts.hfKey ? await rerank(query, candidates, opts.hfKey) : candidates;
  return finalOrder.slice(0, matchCount);
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
