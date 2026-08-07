/*
  Make search_legal_library_fts resilient to natural-language queries.

  plainto_tsquery ANDs every significant word together, so a conversational
  query like "Standard for interim measures in ICC arbitration" requires
  "standard", "interim", "measur", "icc" AND "arbitr" to all appear in the
  same ~600-char chunk — which fails even when a chunk is a perfect semantic
  match (e.g. ICC Rules Article 28 "Conservatory and Interim Measures" has no
  occurrence of the word "standard"). This is the fallback path used when the
  embedding/vector search comes up empty, so its brittleness was silently
  pushing Research/AI Assistant into "no sources found, answering from
  training knowledge" far more often than the corpus actually warranted.

  Fix: try the existing strict AND match first (keeps precision), and only if
  that returns zero rows, retry with an OR-across-terms match. The OR match
  can hit a large fraction of a 240k+ row arbitration-focused corpus (common
  words like "arbitration" appear everywhere), and ts_rank has to recompute
  to_tsvector(title || content) for every candidate row before it can sort —
  ranking every match before LIMIT-ing timed out in testing. So the OR branch
  first grabs a bounded, unranked candidate set via the GIN index (cheap —
  the scan can stop as soon as it has enough rows) and only ranks that
  bounded set, instead of ranking the full match set before limiting.
*/

-- Matches the live signature from 20260729000000_fts_rpc_doc_id.sql (adds
-- doc_id uuid so results can link back to their parent legal_library_documents
-- row) — this migration only changes the matching strategy, not the shape.
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
      LIMIT 200
    ) c
    ORDER BY ts_rank(c.tsv, or_query) DESC
    LIMIT match_count;
  END IF;
END;
$$;
