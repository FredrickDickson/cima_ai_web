import { createClient } from "npm:@supabase/supabase-js@2";

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

/**
 * Fetches full text + metadata for @-tagged cases/legislation (rows in
 * `legal_library_documents`, via their chunks in `legal_library`) and the
 * user's own tagged documents (`documents.extracted_text`).
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
): Promise<TaggedAuthorityContext | null> {
  const hasLibraryDocs = !!libraryDocIds && libraryDocIds.length > 0;
  const hasUserDocs = !!documentIds && documentIds.length > 0 && !!userId;
  if (!hasLibraryDocs && !hasUserDocs) return null;

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

      const label = doc.citation ? `${doc.title} (${doc.citation})` : doc.title;
      markerIndex += 1;
      const marker = `T${markerIndex}`;
      if (!appendSection(`[${marker}] ${label}`, combined)) { markerIndex -= 1; break; }

      titles.push(label);
      citedSources.push({
        marker,
        source_name: doc.title,
        citation: doc.citation ?? undefined,
        source_type: doc.source_type,
        jurisdiction: doc.jurisdiction ?? undefined,
        content: combined.slice(0, MAX_CHARS_PER_ITEM),
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
      markerIndex += 1;
      const marker = `T${markerIndex}`;
      if (!appendSection(`[${marker}] ${doc.name}`, doc.extracted_text)) { markerIndex -= 1; break; }

      titles.push(doc.name);
      citedSources.push({
        marker,
        source_name: doc.name,
        source_type: "document",
        content: doc.extracted_text.slice(0, MAX_CHARS_PER_ITEM),
      });
    }
  }

  if (sections.length === 0) return null;

  return { context: sections.join("\n\n"), titles, citedSources };
}
