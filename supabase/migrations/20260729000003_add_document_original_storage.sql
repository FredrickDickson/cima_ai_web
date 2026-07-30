-- Add a column to track the original uploaded file's Storage key
-- (separate from `file_path`, which is used elsewhere as a display filename)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;

-- Create storage bucket for original document files (PDF/DOCX/etc.)
-- uploaded from the Documents page and Contract Review
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload to the documents bucket
DO $$ BEGIN
  CREATE POLICY "Users can upload to documents bucket"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'documents'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: Authenticated users can view their own files in the documents bucket
DO $$ BEGIN
  CREATE POLICY "Users can view own files in documents bucket"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'documents'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: Authenticated users can delete their own files in the documents bucket
DO $$ BEGIN
  CREATE POLICY "Users can delete own files in documents bucket"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'documents'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
