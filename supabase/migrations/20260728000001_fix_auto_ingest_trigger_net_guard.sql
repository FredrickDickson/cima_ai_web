/*
  # Fix legal-documents auto-ingest trigger: guard the pg_net call

  `handle_legal_doc_upload()` (from 20260615000001_auto_ingest_trigger.sql) calls
  `net.http_post(...)` unguarded whenever both `app_config.supabase_url` and the
  vault `service_role_key` secret are present. On this project `app_config` has
  a `supabase_url` row but the `pg_net` extension is not installed, so every
  upload to the `legal-documents` bucket hard-fails with a schema-not-found
  error (Postgres 3F000) and the whole INSERT (including the upload itself)
  rolls back — blocking ALL uploads to the bucket, not just bulk-imported ones.

  Fix: wrap the `net.http_post` call in the same defensive exception pattern
  already used for the vault secret lookup, so a missing/misconfigured pg_net
  degrades to "skip the auto-ingest notification" instead of failing the upload.

  Also scope the trigger to skip paths under `library/` — those are bulk-managed
  directly by scripts/ingest-law-reports.mjs, not the single-file admin flow
  this trigger exists for.
*/

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

  -- Fetch service role key from Vault
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  -- Only call edge function if both URL and key are configured — and degrade
  -- gracefully (skip notification) if pg_net isn't installed/enabled rather
  -- than failing the upload.
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    BEGIN
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
