/*
  # Legal Library — document grouping, metadata, and viewer support

  Adds a parent "source document" table so chunks in `legal_library` can be
  grouped back into one original case/statute, plus the columns/RPCs needed
  by the Legal Library bulk ingestion + browse/viewer frontend.

  - `legal_library_documents`: one row per source file (case or legislation)
  - `legal_library.doc_id` / `chunk_index`: link chunks back to their parent
    document (replaces the old fragile `ilike title` delete-before-reinsert
    pattern used by `ingest-legal-document` / `scripts/ingest-legal-documents.mjs`)
  - `get_legal_library_document(doc_id)`: parent + ordered chunks in one call
  - `match_legal_library` extended to project `doc_id` and accept `filter_doc_id`
  - Storage RLS: authenticated users can read anything under `legal-documents/library/`
*/

-- ============================================================
-- STEP 1: Parent "source document" table
-- ============================================================

CREATE TABLE legal_library_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT '',      -- reuse existing vocabulary: 'case' | 'statute'
  jurisdiction text NOT NULL DEFAULT 'ghana',
  citation text DEFAULT '',                  -- e.g. "[1973] 1 GLR 273-278" if parsed from filename
  court text DEFAULT '',                     -- 'Supreme Court' | 'Court of Appeal' | 'High Court' | NULL for legislation
  decided_year int,
  parties jsonb DEFAULT '[]'::jsonb,         -- best-effort [{role, name}, ...] parsed from filename
  legislation_number text DEFAULT '',        -- e.g. "C.I. 47"
  storage_path text,                         -- original (pdf/docx) or extracted-text (.txt for htm sources) artifact
  original_format text DEFAULT '',           -- 'docx' | 'pdf' | 'htm-text'
  source_collection text DEFAULT '',         -- which source folder branch, for audit/dedup traceability
  extracted_char_count int DEFAULT 0,
  ingestion_status text NOT NULL DEFAULT 'pending', -- pending|processing|completed|failed
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_library_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view library documents"
  ON legal_library_documents FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_llib_docs_source_type ON legal_library_documents(source_type);
CREATE INDEX idx_llib_docs_court ON legal_library_documents(court);
CREATE INDEX idx_llib_docs_year ON legal_library_documents(decided_year);
CREATE INDEX idx_llib_docs_jurisdiction ON legal_library_documents(jurisdiction);
CREATE INDEX idx_llib_docs_title ON legal_library_documents(title);
CREATE UNIQUE INDEX idx_llib_docs_storage_path ON legal_library_documents(storage_path)
  WHERE storage_path IS NOT NULL;

-- ============================================================
-- STEP 2: Link legal_library chunks to their parent document
-- ============================================================

ALTER TABLE legal_library
  ADD COLUMN doc_id uuid REFERENCES legal_library_documents(id) ON DELETE CASCADE,
  ADD COLUMN chunk_index int;

CREATE INDEX idx_legal_library_doc_id ON legal_library(doc_id);

-- ============================================================
-- STEP 3: RPCs
-- ============================================================

-- Parent document + ordered chunks in one call (for the viewer)
CREATE OR REPLACE FUNCTION get_legal_library_document(doc_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  source_type text,
  jurisdiction text,
  citation text,
  court text,
  decided_year int,
  parties jsonb,
  legislation_number text,
  storage_path text,
  original_format text,
  chunks jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.source_type,
    d.jurisdiction,
    d.citation,
    d.court,
    d.decided_year,
    d.parties,
    d.legislation_number,
    d.storage_path,
    d.original_format,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'chunk_index', c.chunk_index,
            'title', c.title,
            'citation', c.citation,
            'content', c.content
          )
          ORDER BY c.chunk_index NULLS LAST, c.id
        )
        FROM legal_library c
        WHERE c.doc_id = d.id
      ),
      '[]'::jsonb
    ) AS chunks
  FROM legal_library_documents d
  WHERE d.id = get_legal_library_document.doc_id;
END;
$$;

-- Re-create match_legal_library to also project doc_id and accept filter_doc_id.
-- Signature change (new params appended with defaults) keeps existing callers working.
DROP FUNCTION IF EXISTS match_legal_library(vector(384), int, text, text);

CREATE OR REPLACE FUNCTION match_legal_library(
  query_embedding vector(384),
  match_count int DEFAULT 5,
  filter_jurisdiction text DEFAULT NULL,
  filter_source_type text DEFAULT NULL,
  filter_doc_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_type text,
  jurisdiction text,
  citation text,
  doc_id uuid,
  similarity float
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
    ll.doc_id,
    1 - (ll.embedding <=> query_embedding) AS similarity
  FROM legal_library ll
  WHERE ll.embedding IS NOT NULL
    AND (filter_jurisdiction IS NULL OR ll.jurisdiction = filter_jurisdiction)
    AND (filter_source_type IS NULL OR ll.source_type = filter_source_type)
    AND (filter_doc_id IS NULL OR ll.doc_id = filter_doc_id)
  ORDER BY ll.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- STEP 4: Storage — let any authenticated user read shared library files
-- ============================================================

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view library files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'legal-documents'
      AND (storage.foldername(name))[1] = 'library'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
