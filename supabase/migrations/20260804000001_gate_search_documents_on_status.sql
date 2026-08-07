/*
  # Don't surface documents still being extracted in @mention search

  search_documents had no status filter, so a just-uploaded document (row
  created immediately on upload, before text extraction/OCR completes —
  see handleUpload in Documents.tsx) could be tagged before it had any
  extracted_text, silently giving the AI empty content for that source.
  Mirrors the same gate search_legal_library_documents already applies via
  ingestion_status = 'completed'. "processing" (extracted_text populated,
  embed-document/AI-summary still pending) is allowed — tagging only ever
  reads extracted_text directly, never embeddings.
*/

CREATE OR REPLACE FUNCTION search_documents(
  search_query text,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  rank real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    doc.id,
    ts_rank(
      to_tsvector('english',
        coalesce(doc.name, '') || ' ' ||
        coalesce(doc.ai_summary, '') || ' ' ||
        left(coalesce(doc.extracted_text, ''), 20000)
      ),
      websearch_to_tsquery('english', search_query)
    ) AS rank
  FROM documents doc
  WHERE doc.status IN ('processing', 'ready')
    AND to_tsvector('english',
          coalesce(doc.name, '') || ' ' ||
          coalesce(doc.ai_summary, '') || ' ' ||
          left(coalesce(doc.extracted_text, ''), 20000)
        ) @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;
