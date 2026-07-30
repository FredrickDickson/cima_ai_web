-- Temporary diagnostic RPC — dropped in the immediately following migration.
CREATE OR REPLACE FUNCTION public._tmp_introspect_auth_trigger()
RETURNS TABLE (trigger_name text, function_name text, function_body text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tgname::text,
    p.proname::text,
    pg_get_functiondef(p.oid)::text
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'auth.users'::regclass
    AND NOT t.tgisinternal;
END;
$$;
