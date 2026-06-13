-- Create storage bucket for legal documents
-- This bucket will store PDFs, DOCX, and other legal documents
-- that will be automatically ingested into the legal_library table

-- Insert the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-documents',
  'legal-documents',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/msword']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload to the legal-documents bucket
DO $$ BEGIN
  CREATE POLICY "Users can upload to legal-documents bucket"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'legal-documents'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: Authenticated users can view their own files in the legal-documents bucket
DO $$ BEGIN
  CREATE POLICY "Users can view own files in legal-documents bucket"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'legal-documents'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: Authenticated users can delete their own files in the legal-documents bucket
DO $$ BEGIN
  CREATE POLICY "Users can delete own files in legal-documents bucket"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'legal-documents'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create a table to track ingestion status of uploaded documents
CREATE TABLE IF NOT EXISTS legal_document_ingestion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  source_type text NOT NULL DEFAULT 'document',
  jurisdiction text DEFAULT '',
  citation text DEFAULT '',
  chunks_created int DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_document_ingestion ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own ingestion records"
    ON legal_document_ingestion FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own ingestion records"
    ON legal_document_ingestion FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own ingestion records"
    ON legal_document_ingestion FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create index on storage_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_legal_document_ingestion_storage_path ON legal_document_ingestion(storage_path);
CREATE INDEX IF NOT EXISTS idx_legal_document_ingestion_user_id ON legal_document_ingestion(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_document_ingestion_status ON legal_document_ingestion(status);
