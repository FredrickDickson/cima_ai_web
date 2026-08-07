/*
  # Legal Library — jurisdiction filtering + counts

  Extends `search_legal_library_documents` (from 20260731000002) with an
  additive `jurisdiction_filter` param, and adds `get_library_jurisdiction_counts`
  so the Library browse page can show a jurisdiction sidebar with counts that
  stay consistent with whichever source-type/court/year filters are active —
  ready for the day non-Ghana content is ingested, not just today's all-Ghana
  corpus.

  The "All Jurisdictions" browse view now orders by `jurisdiction, decided_year
  desc` (previously just `decided_year desc`) so same-jurisdiction rows stay
  contiguous for client-side section grouping. The existing single-column
  indexes on `jurisdiction` and `decided_year` (20260728000000) can't satisfy
  that two-column ORDER BY without a full sort — confirmed this times out
  against the real dataset (Postgres error 57014, statement timeout) — so add
  a composite index matching the exact sort order used.
*/

CREATE INDEX IF NOT EXISTS idx_llib_docs_jurisdiction_year
  ON legal_library_documents (jurisdiction, decided_year DESC NULLS LAST);

CREATE OR REPLACE FUNCTION search_legal_library_documents(
  search_query text,
  source_type_filter text DEFAULT NULL,
  court_filter text DEFAULT NULL,
  year_filter int DEFAULT NULL,
  match_count int DEFAULT 20,
  jurisdiction_filter text DEFAULT NULL
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
    AND (jurisdiction_filter IS NULL OR d.jurisdiction = jurisdiction_filter)
    AND to_tsvector('english',
          coalesce(d.title, '') || ' ' ||
          coalesce(d.citation, '') || ' ' ||
          coalesce(d.court, '') || ' ' ||
          coalesce(d.legislation_number, '')
        ) @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION get_library_jurisdiction_counts(
  source_type_filter text DEFAULT NULL,
  court_filter text DEFAULT NULL,
  year_filter int DEFAULT NULL
)
RETURNS TABLE (
  jurisdiction text,
  doc_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.jurisdiction,
    count(*) AS doc_count
  FROM legal_library_documents d
  WHERE d.ingestion_status = 'completed'
    AND (source_type_filter IS NULL OR d.source_type = source_type_filter)
    AND (court_filter IS NULL OR d.court = court_filter)
    AND (year_filter IS NULL OR d.decided_year = year_filter)
  GROUP BY d.jurisdiction
  ORDER BY doc_count DESC;
$$;
