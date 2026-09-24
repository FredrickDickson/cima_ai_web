import { createClient } from "npm:@supabase/supabase-js@2";
import { getEmbedding } from "./legal-retrieval.ts";
import { getLibraryDocument, rankChunksByQuery } from "./convex-library.ts";

export interface TaggedCitedSource {
  marker: string;
  source_name: string;
  citation?: string;
  source_type?: string;
  jurisdiction?: string;
  content: string;
  url?: string;
  doc_id?: string;
}

export interface TaggedAuthorityContext {
  context: string;
  titles: string[];
  citedSources: TaggedCitedSource[];
}

// Token budget per tagged authority and overall, so tagging several long
// judgments/statutes/documents at once can't blow the model's context window.
const MAX_CHARS_PER_ITEM = 8000;
const MAX_CHARS_TOTAL = 24000;
// How many of the most relevant chunks to pull per tagged item when a query
// embedding is available.
const RETRIEVAL_MATCH_COUNT = 6;

interface UserDocRow {
  id: string;
  name: string;
  extracted_text: string | null;
}

interface RetrievedChunkRow {
  content: string;
}

// Generic instruction/task-framing words a user's request is often wrapped
// in ("draft a legal essay on...", "explain..."). Left in, these dominate
// the FTS fallback's OR-of-terms ranking (ts_rank has no notion of term
// rarity, so ubiquitous words like "draft"/"legal"/"company" in a company-
// law textbook can outrank chunks about the actual, rarer topic) — stripping
// them before building the search query keeps the ranking on-topic. Not
// applied to the embedding query: semantic search doesn't have this
// bag-of-words weakness.
const FTS_STOPWORDS = new Set([
  "draft", "write", "prepare", "compose", "create", "generate",
  "explain", "describe", "discuss", "summarize", "summarise",
  "analyze", "analyse", "outline", "provide", "give", "list", "identify",
  "essay", "memo", "memorandum", "note", "notes", "opinion", "brief",
  "summary", "overview", "analysis", "please", "kindly", "legal",
  // Question-framing words ("any information, definitions, or principles
  // specifically addressing X") that carry no topical signal but, left in,
  // dilute the OR-tier match set enough that boilerplate repeated across
  // many chunks (e.g. a PDF's running title-page header) can outrank the
  // chunk that actually answers the question — confirmed via a real
  // tagged-document query that surfaced only front-matter until these were
  // added.
  "information", "definitions", "definition", "principles", "principle",
  "specifically", "specific", "addressing", "address", "regarding",
  "concerning", "under", "any", "does",
]);

export function cleanFtsQuery(query: string): string {
  const words = query.toLowerCase().split(/\W+/).filter(Boolean);
  const kept = words.filter((w) => w.length > 2 && !FTS_STOPWORDS.has(w));
  return kept.length > 0 ? kept.join(" ") : query;
}

/**
 * Fetches metadata + the text most relevant to `query` for @-tagged cases/
 * legislation (Convex library docs — see convex-library.ts) and the user's
 * own tagged documents (`documents`, via their chunks in `document_chunks`).
 *
 * When `query` is supplied, each tagged item's most relevant chunks are
 * retrieved (library docs by term overlap via rankChunksByQuery; user docs by
 * embedding similarity via `match_document_chunks`, scoped to that one
 * document, with an FTS fallback) instead of using the
 * item's raw text — a long document previously always contributed its first
 * ~8000 characters (title page/preface for a book), regardless of what was
 * asked. Falls back to that from-the-start behavior when no query/HF key is
 * given, or a document has no embedded chunks yet.
 *
 * IMPORTANT: this runs on the service-role client, which bypasses RLS —
 * the `.eq("user_id", userId)` filter on the `documents` query below is the
 * only thing preventing a tampered/foreign document_id from leaking another
 * user's document text into a synthesized answer, so it must never be
 * dropped.
 */
export async function fetchTaggedAuthorityContext(
  supabase: ReturnType<typeof createClient>,
  userId: string | undefined,
  libraryDocIds: string[] | undefined,
  documentIds: string[] | undefined,
  query?: string,
  hfKey?: string,
): Promise<TaggedAuthorityContext | null> {
  const hasLibraryDocs = !!libraryDocIds && libraryDocIds.length > 0;
  const hasUserDocs = !!documentIds && documentIds.length > 0 && !!userId;
  if (!hasLibraryDocs && !hasUserDocs) return null;

  const queryEmbedding = query && hfKey ? await getEmbedding(query, hfKey) : null;

  const sections: string[] = [];
  const titles: string[] = [];
  const citedSources: TaggedCitedSource[] = [];
  let markerIndex = 0;
  let totalChars = 0;

  function appendSection(title: string, body: string): boolean {
    if (totalChars >= MAX_CHARS_TOTAL) return false;
    const capped = body.slice(0, Math.min(MAX_CHARS_PER_ITEM, MAX_CHARS_TOTAL - totalChars));
    sections.push(`## ${title}\n${capped}`);
    totalChars += capped.length;
    return true;
  }

  if (hasLibraryDocs) {
    // Library docs live in Convex (see convex-library.ts). Each tagged doc's
    // chunks come back in one call; with a query, keep the chunks that
    // mention its terms, else fall back to the doc from the start.
    const found = await Promise.all(
      libraryDocIds!.map((id) =>
        getLibraryDocument(id).catch((err) => {
          console.error(`getLibraryDocument failed for ${id}:`, err);
          return null;
        })
      ),
    );

    for (const entry of found) {
      if (!entry) continue;
      const doc = entry.document;
      const combined = entry.chunks.map((c) => c.content).join("\n\n");
      if (!combined) continue;

      let body = combined;
      if (query) {
        const relevant = rankChunksByQuery(entry.chunks, cleanFtsQuery(query), RETRIEVAL_MATCH_COUNT);
        if (relevant.length > 0) body = relevant.map((c) => c.content).join("\n\n");
      }

      const label = doc.citation ? `${doc.title} (${doc.citation})` : doc.title;
      markerIndex += 1;
      const marker = `T${markerIndex}`;
      if (!appendSection(`[${marker}] ${label}`, body)) { markerIndex -= 1; break; }

      titles.push(label);
      citedSources.push({
        marker,
        source_name: doc.title,
        citation: doc.citation ?? undefined,
        source_type: doc.source_type,
        jurisdiction: doc.jurisdiction ?? undefined,
        content: body.slice(0, MAX_CHARS_PER_ITEM),
        doc_id: doc.id,
      });
    }
  }

  if (hasUserDocs) {
    const { data: userDocs } = (await supabase
      .from("documents")
      .select("id, name, extracted_text")
      .in("id", documentIds!)
      .eq("user_id", userId!)) as unknown as { data: UserDocRow[] | null };

    for (const doc of userDocs ?? []) {
      if (!doc.extracted_text) continue;

      let body = doc.extracted_text;
      let retrieved = false;

      if (queryEmbedding) {
        try {
          const { data: relevant } = await supabase.rpc("match_document_chunks", {
            query_embedding: queryEmbedding,
            match_count: RETRIEVAL_MATCH_COUNT,
            filter_user_id: userId,
            filter_document_id: doc.id,
          }) as unknown as { data: RetrievedChunkRow[] | null };
          if (relevant && relevant.length > 0) {
            body = relevant.map((c) => c.content).join("\n\n");
            retrieved = true;
          }
        } catch (err) {
          console.error(`match_document_chunks retrieval failed for ${doc.id}, trying FTS fallback:`, err);
        }
      }

      // Vector retrieval requires embeddings, which embed-document doesn't
      // always manage to generate (e.g. the Hugging Face call failing) —
      // full-text search needs no embedding and works off the same chunks.
      if (!retrieved && query) {
        try {
          const { data: relevant } = await supabase.rpc("search_document_chunks_fts", {
            search_query: cleanFtsQuery(query).slice(0, 300),
            match_count: RETRIEVAL_MATCH_COUNT,
            filter_user_id: userId,
            filter_document_id: doc.id,
          }) as unknown as { data: RetrievedChunkRow[] | null };
          if (relevant && relevant.length > 0) {
            body = relevant.map((c) => c.content).join("\n\n");
            retrieved = true;
          }
        } catch (err) {
          console.error(`search_document_chunks_fts retrieval failed for ${doc.id}, falling back to full text:`, err);
        }
      }

      markerIndex += 1;
      const marker = `T${markerIndex}`;
      if (!appendSection(`[${marker}] ${doc.name}`, body)) { markerIndex -= 1; break; }

      titles.push(doc.name);
      citedSources.push({
        marker,
        source_name: doc.name,
        source_type: "document",
        content: body.slice(0, MAX_CHARS_PER_ITEM),
      });
    }
  }

  if (sections.length === 0) return null;

  return { context: sections.join("\n\n"), titles, citedSources };
}
