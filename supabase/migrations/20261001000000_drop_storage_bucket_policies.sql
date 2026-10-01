-- File storage moved to Convex (convex/userFiles.ts, libraryDocuments.storageId).
-- The documents / avatars / legal-documents buckets were emptied and deleted
-- by scripts/purge-supabase-storage.mjs (Supabase blocks deleting storage rows
-- from SQL); this drops the storage.objects policies that served them.

DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files in documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in documents bucket" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view library files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files in legal-documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to legal-documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in legal-documents bucket" ON storage.objects;
