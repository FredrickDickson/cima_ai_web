import { createClient } from "npm:@supabase/supabase-js@2";
import { getEmbedding } from "./legal-retrieval.ts";

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

interface LibraryDocRow {
  id: string;
  title: string;
  citation: string | null;
  source_type: string;
  jurisdiction: string | null;
}

interface LibraryChunkRow {
  doc_id: string;
  content: string;
  chunk_index: number | null;
}

interface UserDocRow {
  id: string;
  name: string;
  extracted_text: string | null;
}

interface RetrievedChunkRow {
  content: string;
}

/**
 * Fetches metadata + the text most relevant to `query` for @-tagged cases/
 * legislation (rows in `legal_library_documents`, via their chunks in
 * `legal_library`) and the user's own tagged documents (`documents`, via
 * their chunks in `document_chunks`).
 *
 * When `query`/`hfKey` are supplied, each tagged item's most relevant chunks
 * are retrieved by embedding similarity (via `match_legal_library` /
 * `match_document_chunks`, scoped to that one document) instead of using the
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
    const [{ data: docs }, { data: chunks }] = await Promise.all([
      supabase
        .from("legal_library_documents")
        .select("id, title, citation, source_type, jurisdiction")
        .in("id", libraryDocIds!) as unknown as Promise<{ data: LibraryDocRow[] | null }>,
      supabase
        .from("legal_library")
        .select("doc_id, content, chunk_index")
        .in("doc_id", libraryDocIds!)
        .order("chunk_index") as unknown as Promise<{ data: LibraryChunkRow[] | null }>,
    ]);

    for (const doc of docs ?? []) {
      const docChunks = (chunks ?? []).filter((c) => c.doc_id === doc.id);
      const combined = docChunks.map((c) => c.content).join("\n\n");
      if (!combined) continue;

      let body = combined;
      if (queryEmbedding) {
        try {
          const { data: relevant } = await supabase.rpc("match_legal_library", {
            query_embedding: queryEmbedding,
            match_count: RETRIEVAL_MATCH_COUNT,
            filter_doc_id: doc.id,
          }) as unknown as { data: RetrievedChunkRow[] | null };
          if (relevant && relevant.length > 0) {
            body = relevant.map((c) => c.content).join("\n\n");
          }
        } catch (err) {
          console.error(`match_legal_library retrieval failed for ${doc.id}, falling back to full text:`, err);
        }
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
            search_query: query.slice(0, 300),
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
