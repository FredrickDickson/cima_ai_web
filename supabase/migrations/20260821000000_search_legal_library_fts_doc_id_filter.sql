-- Scope search_legal_library_fts to one document, mirroring match_legal_library's
-- existing filter_doc_id and search_document_chunks_fts's filter_document_id.
--
-- fetchTaggedAuthorityContext's Legal Library branch (tagged-authorities.ts)
-- had no full-text-search fallback when match_legal_library returned zero
-- rows (e.g. a tagged document's chunks have embedding IS NULL) — it fell
-- straight back to the document's chunks joined in chunk_index order, sliced
-- to the first ~8000 chars. For a book that's always the introduction,
-- regardless of what was actually asked (mirrors the exact bug
-- 20260820000002_document_chunks_fts_fallback.sql fixed for user documents).
-- This function needs a per-document filter before it can be used the same
-- way here — until now it only searched the whole corpus.

CREATE OR REPLACE FUNCTION search_legal_library_fts(
  search_query text,
  match_count int DEFAULT 5,
  filter_doc_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_type text,
  jurisdiction text,
  citation text,
  doc_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  and_query tsquery := plainto_tsquery('english', search_query);
  or_query tsquery := to_tsquery('english', regexp_replace(and_query::text, ' & ', ' | ', 'g'));
BEGIN
  RETURN QUERY
  SELECT
    ll.id,
    ll.title,
    ll.content,
    ll.source_type,
    ll.jurisdiction,
    ll.citation,
    ll.doc_id
  FROM legal_library ll
  WHERE to_tsvector('english', ll.title || ' ' || ll.content) @@ and_query
    AND (filter_doc_id IS NULL OR ll.doc_id = filter_doc_id)
  ORDER BY ts_rank(
    to_tsvector('english', ll.title || ' ' || ll.content),
    and_query
  ) DESC
  LIMIT match_count;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      c.id,
      c.title,
      c.content,
      c.source_type,
      c.jurisdiction,
      c.citation,
      c.doc_id
    FROM (
      SELECT ll.*, to_tsvector('english', ll.title || ' ' || ll.content) AS tsv
      FROM legal_library ll
      WHERE to_tsvector('english', ll.title || ' ' || ll.content) @@ or_query
        AND (filter_doc_id IS NULL OR ll.doc_id = filter_doc_id)
      LIMIT 200
    ) c
    ORDER BY ts_rank(c.tsv, or_query) DESC
    LIMIT match_count;
  END IF;
END;
$$;
