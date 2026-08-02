/*
  # Fix get_library_jurisdiction_counts timing out

  Confirmed directly against the live database: get_library_jurisdiction_counts
  (GROUP BY jurisdiction WHERE ingestion_status = 'completed') times out
  (Postgres 57014) now that legal_library_documents has grown past ~16k rows —
  there was no index supporting the ingestion_status filter, forcing a full
  table scan for every call. This is what made the Library page's jurisdiction
  sidebar (and total count) show 0 despite the data being fully intact.

  A partial index on jurisdiction, scoped to completed rows, matches this
  RPC's exact WHERE+GROUP BY pattern (and also helps
  search_legal_library_documents's jurisdiction_filter) — turns the full scan
  into an index-only scan + group aggregate.
*/

CREATE INDEX IF NOT EXISTS idx_llib_docs_completed_jurisdiction
  ON legal_library_documents (jurisdiction)
  WHERE ingestion_status = 'completed';
