-- Let match_document_chunks scope similarity search to one specific document,
-- mirroring the filter_doc_id param match_legal_library already has (see
-- 20260728000000_library_documents_and_grouping.sql). Needed so @-tagged
-- documents can be retrieved by relevance to the user's actual question
-- instead of always returning the first N characters of the document.
DROP FUNCTION IF EXISTS match_document_chunks(vector(384), int, uuid);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
  filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_name text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    d.name AS document_name,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  LEFT JOIN documents d ON d.id = dc.document_id
  WHERE dc.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR dc.user_id = filter_user_id)
    AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
