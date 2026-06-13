-- Add avatar_url column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';

-- Create public avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload their own avatar
DO $$ BEGIN
  CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: anyone can view avatars (public bucket)
DO $$ BEGIN
  CREATE POLICY "Avatars are publicly viewable"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: users can update their own avatar
DO $$ BEGIN
  CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy: users can delete their own avatar
DO $$ BEGIN
  CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
