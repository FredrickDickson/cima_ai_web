/*
  # Add doc_id to search_legal_library_fts

  match_legal_library already projects doc_id (see 20260728000000), but the
  FTS fallback RPC used when no embedding is available did not — so results
  reaching the frontend via that path had no way to link back to their parent
  legal_library_documents row for the Library viewer.
*/

DROP FUNCTION IF EXISTS search_legal_library_fts(text, int);

CREATE OR REPLACE FUNCTION search_legal_library_fts(
  search_query text,
  match_count int DEFAULT 5
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
  WHERE to_tsvector('english', ll.title || ' ' || ll.content)
        @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank(
    to_tsvector('english', ll.title || ' ' || ll.content),
    plainto_tsquery('english', search_query)
  ) DESC
  LIMIT match_count;
END;
$$;
