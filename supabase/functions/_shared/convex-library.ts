/**
 * The legal library (case law + legislation) lives entirely in Convex — the
 * Supabase `legal_library` / `legal_library_documents` tables were migrated
 * there (scripts/migrate-legal-library-to-convex.mjs) and dropped. These
 * helpers wrap convex/http.ts's library routes so edge functions never talk
 * to those tables.
 *
 * Library doc ids are Convex ids; pre-migration Supabase UUIDs (old links,
 * stored citations) are still accepted and resolved on the Convex side.
 */

export interface LibraryDoc {
  id: string;
  title: string;
  source_type: string;
  jurisdiction: string;
  citation: string;
  court: string;
  decided_year: number | null;
  parties: { role: string; name: string }[];
  legislation_number: string;
}

export interface LibraryChunk {
  id: string;
  chunk_index: number;
  content: string;
}

/** A chunk-level search hit — same shape the old search RPCs returned. */
export interface LibrarySearchHit {
  id: string;
  source_name: string;
  citation?: string;
  source_type: string;
  jurisdiction?: string;
  content: string;
  similarity?: number;
  doc_id?: string;
}

function siteUrl(): string {
  const url = Deno.env.get("CONVEX_SITE_URL");
  if (!url) throw new Error("CONVEX_SITE_URL is not configured");
  return url;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${siteUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Convex ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

/** Chunk search (vector when an embedding is given, else full-text). Fails soft to []. */
export async function searchLibraryChunks(
  query: string,
  opts: { embedding?: number[] | null; jurisdiction?: string; sourceType?: string; matchCount?: number } = {},
): Promise<LibrarySearchHit[]> {
  try {
    const data = await post<LibrarySearchHit[]>("/searchLibrary", {
      query,
      embedding: opts.embedding ?? undefined,
      jurisdiction: opts.jurisdiction,
      sourceType: opts.sourceType,
      matchCount: opts.matchCount ?? 6,
    });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("searchLibraryChunks failed:", err);
    return [];
  }
}

/** One doc with its ordered chunks, or null if the id is unknown. */
export async function getLibraryDocument(
  id: string,
): Promise<{ document: LibraryDoc; chunks: LibraryChunk[]; truncated: boolean } | null> {
  const data = await post<
    { found: false } | { found: true; document: LibraryDoc; chunks: LibraryChunk[]; truncated: boolean }
  >("/getLibraryDocument", { id });
  return data.found ? { document: data.document, chunks: data.chunks, truncated: data.truncated } : null;
}

/** Metadata for several docs, input order preserved, unknown ids dropped. */
export async function getLibraryDocuments(ids: string[]): Promise<LibraryDoc[]> {
  if (ids.length === 0) return [];
  return await post<LibraryDoc[]>("/getLibraryDocuments", { ids });
}

/** Number of completed library docs, optionally of one source type. */
export async function countLibraryDocuments(sourceType?: string): Promise<number> {
  const { count } = await post<{ count: number }>("/libraryDocumentCount", { sourceType });
  return count;
}

/**
 * Picks the `limit` chunks of one document most relevant to `query` by simple
 * term overlap, returned in document order. Stands in for the old doc-scoped
 * vector/FTS RPCs (filter_doc_id) — a single document's chunks are already in
 * hand, and embeddings are disabled (see legal-retrieval.ts's getEmbedding).
 * Returns [] when nothing matches, so callers keep their full-text fallback.
 */
export function rankChunksByQuery(chunks: LibraryChunk[], query: string, limit: number): LibraryChunk[] {
  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])];
  if (terms.length === 0) return [];
  const scored = chunks
    .map((c) => {
      const text = c.content.toLowerCase();
      const score = terms.reduce((n, t) => n + (text.includes(t) ? 1 : 0), 0);
      return { c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.c);
  return scored.sort((a, b) => a.chunk_index - b.chunk_index);
}

/** A passage from a large (Convex-hosted, 500+ page) user document. */
export interface LargeDocumentChunk {
  content: string;
  pageStart: number;
  pageEnd: number;
}

/**
 * The passages of one of `ownerId`'s large documents most relevant to
 * `query` (Convex full-text search), falling back to its opening passages
 * when nothing matches. Null when the id isn't a large document owned by
 * `ownerId` — the ownership check happens on the Convex side. Unlike the
 * library routes this searches private user content, so it is gated by
 * INGEST_SECRET.
 */
export async function searchLargeDocument(
  docId: string,
  ownerId: string,
  query: string,
  matchCount = 6,
): Promise<{ name: string; status: string; chunks: LargeDocumentChunk[] } | null> {
  const secret = Deno.env.get("INGEST_SECRET");
  if (!secret) throw new Error("INGEST_SECRET is not configured");
  const data = await post<
    { found: false } | { found: true; name: string; status: string; chunks: LargeDocumentChunk[] }
  >("/searchLargeDocument", { secret, docId, ownerId, query, matchCount });
  return data.found ? { name: data.name, status: data.status, chunks: data.chunks } : null;
}
