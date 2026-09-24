import { searchLibraryChunks } from "./convex-library.ts";

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
  // "convex" for legal-library hits (the whole library lives in Convex — its
  // doc_id opens /library/:docId). Other sources merged in by legal-search
  // (Laws.Africa, CourtListener, the user's own document chunks) leave it unset.
  source?: "supabase" | "convex";
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

// Embeddings are intentionally disabled — the Hugging Face Inference API
// token is invalid (401 on every call) and not something a code fix can
// repair, and an in-process local-model replacement (running
// @huggingface/transformers inside a Convex Node action) turned out to hit
// a stack of real, unrelated incompatibilities between that library's
// browser/Node build split and Convex's sandbox (env-detection assuming
// the Node build's file-path semantics; onnxruntime-web's WASM loader using
// a browser-only `blob:` dynamic-import scheme Node's ESM loader rejects) —
// not a "few lines" fix, with no guarantee there wasn't a fourth issue
// behind that one. Given every embedding-consuming RPC already has a
// working, exercised full-text-search fallback (search_document_chunks_fts,
// search_legal_library_fts, Convex's fullTextSearch — see the vector RPCs
// below, all of which already degrade to FTS when the embedding is null),
// returning null here immediately rather than attempting a doomed network
// call is a correct, low-risk way to run FTS-only until this is revisited
// (e.g. during the planned Convex database migration, or with a hosted
// provider that has a valid token). Signatures kept intact so no caller
// needs to change.
export async function getEmbedding(_text: string, _hfKey: string): Promise<number[] | null> {
  return null;
}

/** Batch variant of getEmbedding. See getEmbedding's comment — embeddings are disabled. */
export async function getEmbeddings(texts: string[], _hfKey: string): Promise<(number[] | null)[]> {
  return texts.map(() => null);
}

/**
 * Search over the legal library (Convex `libraryChunks` — see
 * _shared/convex-library.ts): vector search when an embedding is available,
 * full-text otherwise. Pass a pre-computed `embedding` when the caller already
 * needs one for another RPC too (e.g. legal-search also reuses it for
 * `match_document_chunks`) — otherwise pass `hfKey` and one will be computed
 * here. The single retrieval brain for legal-search's AI Search, Research.tsx,
 * and ai-chat's research-mode grounding.
 *
 * `_supabase` is unused since the library moved to Convex; kept so the
 * existing call sites don't change.
 */
export async function searchLegalLibrary(
  query: string,
  // deno-lint-ignore no-explicit-any
  _supabase: any,
  opts: {
    embedding?: number[] | null;
    hfKey?: string;
    jurisdiction?: string;
    sourceType?: string;
    matchCount?: number;
  } = {},
): Promise<RetrievedLibrarySource[]> {
  const embedding = opts.embedding !== undefined
    ? opts.embedding
    : (opts.hfKey ? await getEmbedding(query, opts.hfKey) : null);

  const hits = await searchLibraryChunks(query, {
    embedding,
    jurisdiction: opts.jurisdiction,
    sourceType: opts.sourceType,
    matchCount: opts.matchCount ?? 6,
  });
  return hits.map((h) => ({ ...h, source: "convex" as const }));
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
