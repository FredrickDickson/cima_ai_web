-- The legal library now lives in Convex (libraryDocuments / libraryChunks),
-- copied by scripts/migrate-legal-library-to-convex.mjs. Dropping the
-- Supabase copy frees ~1.2 GB and brings the project back under its
-- database-size quota.
--
-- Run AFTER the copy has been verified (scripts/verify-legal-library-migration.mjs),
-- then run scripts/rekey-case-tables-to-convex.mjs to rewrite the existing
-- case_* rows from Supabase UUIDs to Convex ids.

-- ─── 1. Case-tool tables: detach from legal_library_documents ─────────────
-- case_briefs / case_citations / case_citator_runs keep their rows, but their
-- library-doc columns now hold Convex ids (text), so the FKs go.

ALTER TABLE case_citations
  DROP CONSTRAINT IF EXISTS case_citations_cited_doc_id_fkey,
  DROP CONSTRAINT IF EXISTS case_citations_citing_doc_id_fkey,
  DROP CONSTRAINT IF EXISTS case_citations_citing_chunk_id_fkey;
ALTER TABLE case_citator_runs DROP CONSTRAINT IF EXISTS case_citator_runs_cited_doc_id_fkey;
ALTER TABLE case_briefs DROP CONSTRAINT IF EXISTS case_briefs_doc_id_fkey;

ALTER TABLE case_citations
  ALTER COLUMN cited_doc_id TYPE text,
  ALTER COLUMN citing_doc_id TYPE text,
  ALTER COLUMN citing_chunk_id TYPE text;
ALTER TABLE case_citator_runs ALTER COLUMN cited_doc_id TYPE text;
ALTER TABLE case_briefs ALTER COLUMN doc_id TYPE text;

-- ─── 2. Auto-ingest pipeline (legal-documents bucket → ingest-legal-document) ─

DROP TRIGGER IF EXISTS on_legal_doc_upload ON storage.objects;
DROP FUNCTION IF EXISTS public.handle_legal_doc_upload();

-- ─── 3. Library RPCs ──────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_legal_library_document(uuid);
DROP FUNCTION IF EXISTS public.match_legal_library(vector, integer, text, text, uuid);
DROP FUNCTION IF EXISTS public.search_legal_library_documents(text, text, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.get_library_jurisdiction_counts(text, text, integer);
DROP FUNCTION IF EXISTS public.search_legal_library_fts(text, integer, uuid);

-- ─── 4. Library tables ────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.legal_library;
DROP TABLE IF EXISTS public.legal_library_documents;
DROP TABLE IF EXISTS public.legal_document_ingestion;
