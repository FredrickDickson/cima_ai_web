/*
  # Lock down billing RPCs to service_role only

  deduct_ai_action, add_extra_ai_actions, and reset_monthly_ai_actions are
  SECURITY DEFINER but were never explicitly restricted to service_role —
  Postgres grants EXECUTE on new functions to PUBLIC by default, and
  Supabase's anon/authenticated roles inherit from PUBLIC. That means these
  were very likely callable directly via PostgREST
  (POST /rest/v1/rpc/add_extra_ai_actions) with nothing but the public anon
  key, letting any caller grant themselves free AI-action credits or drain
  another user's allowance. Mirrors the pattern already used for
  find_user_id_by_email in 20260801000007_email_lookup.sql. Only edge
  functions (service-role client) and pg_cron (runs as the owning role,
  unaffected by this) ever need to call these.

  downgrade_expired_subscriptions is intentionally omitted — it was dropped
  by 20260801000008_retire_downgrade_cron.sql.
*/

REVOKE ALL ON FUNCTION deduct_ai_action(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deduct_ai_action(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION add_extra_ai_actions(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_extra_ai_actions(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION reset_monthly_ai_actions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_monthly_ai_actions() TO service_role;
