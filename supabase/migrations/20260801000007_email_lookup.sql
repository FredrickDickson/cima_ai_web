/*
  # Email → user_id lookup for Paystack webhook correlation

  Paystack's `subscription.create` event (fired once, right after a customer
  subscribes) doesn't carry our own `metadata` — only the customer's email.
  `auth.users` isn't reachable via PostgREST, so the webhook needs a
  SECURITY DEFINER function to resolve it. Restricted to service_role only:
  this is an email-enumeration-capable lookup, so it must never be callable
  with the anon/authenticated keys the webhook doesn't use anyway.
*/

CREATE OR REPLACE FUNCTION find_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

REVOKE ALL ON FUNCTION find_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_user_id_by_email(text) TO service_role;
