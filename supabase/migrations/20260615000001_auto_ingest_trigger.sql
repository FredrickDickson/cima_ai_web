-- ============================================================
-- AUTO-INGEST TRIGGER FOR LEGAL DOCUMENTS
-- ============================================================
-- When a file is uploaded to the "legal-documents" storage bucket,
-- this trigger automatically:
--   1. Creates a record in legal_document_ingestion (status=pending)
--   2. Calls the ingest-legal-document edge function via pg_net
--
-- ONE-TIME SETUP (run these in the Supabase SQL editor after applying this migration):
--
--   -- 1. Store your service role key in Vault:
--   SELECT vault.create_secret(
--     'your-service-role-key-here',   -- the actual key value
--     'service_role_key',             -- the secret name
--     'Service role key for internal edge function calls'
--   );
--
--   -- 2. Set your Supabase project URL:
--   INSERT INTO public.app_config (key, value)
--   VALUES ('supabase_url', 'https://YOUR-PROJECT-REF.supabase.co')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- ============================================================

-- Public config table for non-secret settings (e.g. Supabase URL)
CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write app_config
CREATE POLICY "Service role only"
  ON public.app_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Make user_id nullable in legal_document_ingestion so admin uploads
-- (where owner is unknown) can still be tracked
ALTER TABLE public.legal_document_ingestion
  ALTER COLUMN user_id DROP NOT NULL;

-- ─── TRIGGER FUNCTION ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_legal_doc_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_supabase_url   text;
  v_service_key    text;
  v_storage_path   text;
  v_owner          uuid;
  v_source_type    text := 'statute';
  v_jurisdiction   text := 'ghana';
BEGIN
  -- Only process new uploads to legal-documents bucket
  IF NEW.bucket_id IS DISTINCT FROM 'legal-documents' THEN
    RETURN NEW;
  END IF;

  -- Skip folder markers (0-byte objects ending with /)
  IF NEW.name LIKE '%/' THEN
    RETURN NEW;
  END IF;

  v_storage_path := NEW.name;
  v_owner        := NEW.owner;  -- may be NULL for service-role uploads

  -- Create / reset ingestion record
  INSERT INTO public.legal_document_ingestion (
    user_id, storage_path, source_type, jurisdiction, citation, status
  )
  VALUES (
    v_owner,
    v_storage_path,
    v_source_type,
    v_jurisdiction,
    v_storage_path,   -- citation will be refined by the edge function
    'pending'
  )
  ON CONFLICT (storage_path)
    DO UPDATE SET
      status        = 'pending',
      error_message = NULL,
      chunks_created = 0,
      updated_at    = now();

  -- Fetch Supabase URL from config table
  SELECT value INTO v_supabase_url
  FROM public.app_config
  WHERE key = 'supabase_url';

  -- Fetch service role key from Vault
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  -- Only call edge function if both URL and key are configured
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/ingest-legal-document',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object(
        'storage_path', v_storage_path,
        'source_type',  v_source_type,
        'jurisdiction', v_jurisdiction
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ─── ATTACH TRIGGER ──────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_legal_doc_upload ON storage.objects;

CREATE TRIGGER on_legal_doc_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_legal_doc_upload();
