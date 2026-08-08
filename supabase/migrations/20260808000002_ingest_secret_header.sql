/*
  ingest-legal-document is now gated by a shared secret (x-ingest-secret
  header) instead of being fully open — it was reachable by anyone with the
  anon key, who could force re-ingestion of arbitrary storage paths or, via
  the title-prefix delete, mass-delete legal_library rows with a crafted
  citation. This mirrors convex/lib/ingestAuth.ts's existing pattern for the
  same kind of internal-only pipeline endpoint.

  Generates a random secret into Vault (idempotent — reuses an existing one
  if already present) and updates the storage-upload trigger to send it.
  After this migration runs, the SAME value must also be set as the
  ingest-legal-document Edge Function's INGEST_SECRET secret
  (`supabase secrets set INGEST_SECRET=<value>`), or the trigger's calls will
  get rejected with 401 and auto-ingest will silently stop (fails safe: the
  legal_document_ingestion row stays 'pending', the upload itself is
  unaffected since the net.http_post call is already exception-guarded).
*/

SELECT vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ingest_secret')
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'ingest_secret');

CREATE OR REPLACE FUNCTION public.handle_legal_doc_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_supabase_url   text;
  v_service_key    text;
  v_ingest_secret  text;
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

  -- Skip the Legal Library bulk-import path — handled directly by
  -- scripts/ingest-law-reports.mjs, not this single-file admin flow.
  IF NEW.name LIKE 'library/%' THEN
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

  -- Fetch service role key + ingest secret from Vault
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_ingest_secret
    FROM vault.decrypted_secrets
    WHERE name = 'ingest_secret'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_ingest_secret := NULL;
  END;

  -- Only call edge function if both URL and key are configured — and degrade
  -- gracefully (skip notification) if pg_net isn't installed/enabled rather
  -- than failing the upload.
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    BEGIN
      PERFORM net.http_post(
        url     := v_supabase_url || '/functions/v1/ingest-legal-document',
        headers := jsonb_build_object(
          'Content-Type',   'application/json',
          'Authorization',  'Bearer ' || v_service_key,
          'x-ingest-secret', v_ingest_secret
        ),
        body    := jsonb_build_object(
          'storage_path', v_storage_path,
          'source_type',  v_source_type,
          'jurisdiction', v_jurisdiction
        )::text
      );
    EXCEPTION WHEN OTHERS THEN
      -- pg_net not installed/enabled, or the call otherwise failed — the
      -- ingestion record above still exists with status='pending' so it can
      -- be picked up by scripts/ingest-legal-documents.mjs later; don't let
      -- this block the storage upload itself.
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
