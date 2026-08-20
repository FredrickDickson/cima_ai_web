-- Raise the documents bucket's server-side file size limit to match the
-- client-side MAX_FILE_SIZE_BYTES cap (raised from 20MB to 100MB in
-- src/lib/fileUtils.ts) so long scanned PDFs aren't rejected by Storage
-- after already passing client-side validation.
UPDATE storage.buckets
SET file_size_limit = 104857600 -- 100MB
WHERE id = 'documents';
