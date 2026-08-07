-- Full-text search for legal_library_documents (browse/title table) and documents
-- (user-uploaded files) — fixes naive ILIKE substring search that fails on
-- punctuation/word-boundary mismatches (e.g. "mensah v mensah" not matching
-- "MENSAH v. MENSAH"). Mirrors the existing idx_legal_library_fts pattern
-- already used on the chunk-level legal_library table.

CREATE INDEX IF NOT EXISTS idx_legal_library_documents_fts
  ON legal_library_documents
  USING gin (to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(citation, '') || ' ' ||
    coalesce(court, '') || ' ' ||
    coalesce(legislation_number, '')
  ));

CREATE INDEX IF NOT EXISTS idx_documents_fts
  ON documents
  USING gin (to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(ai_summary, '') || ' ' ||
    left(coalesce(extracted_text, ''), 20000)
  ));

CREATE OR REPLACE FUNCTION search_legal_library_documents(
  search_query text,
  source_type_filter text DEFAULT NULL,
  court_filter text DEFAULT NULL,
  year_filter int DEFAULT NULL,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  source_type text,
  citation text,
  court text,
  decided_year int,
  source_collection text,
  rank real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id, d.title, d.source_type, d.citation, d.court, d.decided_year, d.source_collection,
    ts_rank(
      to_tsvector('english',
        coalesce(d.title, '') || ' ' ||
        coalesce(d.citation, '') || ' ' ||
        coalesce(d.court, '') || ' ' ||
        coalesce(d.legislation_number, '')
      ),
      websearch_to_tsquery('english', search_query)
    ) AS rank
  FROM legal_library_documents d
  WHERE d.ingestion_status = 'completed'
    AND (source_type_filter IS NULL OR d.source_type = source_type_filter)
    AND (court_filter IS NULL OR d.court = court_filter)
    AND (year_filter IS NULL OR d.decided_year = year_filter)
    AND to_tsvector('english',
          coalesce(d.title, '') || ' ' ||
          coalesce(d.citation, '') || ' ' ||
          coalesce(d.court, '') || ' ' ||
          coalesce(d.legislation_number, '')
        ) @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

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
  WHERE to_tsvector('english',
          coalesce(doc.name, '') || ' ' ||
          coalesce(doc.ai_summary, '') || ' ' ||
          left(coalesce(doc.extracted_text, ''), 20000)
        ) @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;
