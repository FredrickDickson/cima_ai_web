-- Full-text search fallback for document_chunks, mirroring the proven
-- AND-then-OR pattern in search_legal_library_fts (20260807000000_fts_or_fallback.sql).
-- Needed because document_chunks.embedding is NULL for every row today (the
-- Hugging Face embedding call in embed-document is failing silently), so the
-- pgvector-based match_document_chunks RPC always returns zero rows. This
-- gives @-tagged document retrieval a working relevance-ranked fallback that
-- doesn't depend on embeddings at all.

CREATE INDEX IF NOT EXISTS idx_document_chunks_fts
  ON document_chunks
  USING gin (to_tsvector('english', content));

CREATE OR REPLACE FUNCTION search_document_chunks_fts(
  search_query text,
  match_count int DEFAULT 6,
  filter_user_id uuid DEFAULT NULL,
  filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_name text,
  content text
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
    dc.id,
    dc.document_id,
    d.name,
    dc.content
  FROM document_chunks dc
  LEFT JOIN documents d ON d.id = dc.document_id
  WHERE (filter_user_id IS NULL OR dc.user_id = filter_user_id)
    AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND to_tsvector('english', dc.content) @@ and_query
  ORDER BY ts_rank(to_tsvector('english', dc.content), and_query) DESC
  LIMIT match_count;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      c.id,
      c.document_id,
      c.name,
      c.content
    FROM (
      SELECT dc.id, dc.document_id, d.name, dc.content,
             to_tsvector('english', dc.content) AS tsv
      FROM document_chunks dc
      LEFT JOIN documents d ON d.id = dc.document_id
      WHERE (filter_user_id IS NULL OR dc.user_id = filter_user_id)
        AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
        AND to_tsvector('english', dc.content) @@ or_query
      LIMIT 200
    ) c
    ORDER BY ts_rank(c.tsv, or_query) DESC
    LIMIT match_count;
  END IF;
END;
$$;
