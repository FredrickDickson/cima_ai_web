/*
  # Fix legal_library_documents storage_path constraint for upsert

  The partial unique index from 20260728000000 (`WHERE storage_path IS NOT NULL`)
  can't be used as an ON CONFLICT target by PostgREST's upsert — Postgres only
  matches ON CONFLICT against a plain unique constraint/index. Every row the
  ingestion script writes always sets storage_path, so replace it with a real
  UNIQUE constraint.
*/

DROP INDEX IF EXISTS idx_llib_docs_storage_path;

ALTER TABLE legal_library_documents
  ADD CONSTRAINT legal_library_documents_storage_path_key UNIQUE (storage_path);
