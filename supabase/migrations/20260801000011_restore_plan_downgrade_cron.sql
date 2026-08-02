/*
  # Restore self-managed plan expiry downgrade

  Reverses 20260801000008_retire_downgrade_cron.sql. That migration dropped
  this in favour of real Paystack Subscriptions — since reverted (see
  paystack-initialize's header comment): recurring billing on Paystack
  requires a reusable payment authorization, which only cards support, and
  most users here pay via Mobile Money. Every plan purchase is a one-off
  charge again, self-tracked via subscription_renews_at, so this needs to
  come back as the mechanism that reverts a lapsed paid plan to Free when no
  repeat charge arrives before the period ends.
*/

CREATE OR REPLACE FUNCTION downgrade_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET plan = 'free',
      plan_status = 'active',
      subscription_renews_at = NULL
  WHERE plan IN ('pro', 'max')
    AND subscription_renews_at IS NOT NULL
    AND subscription_renews_at <= now();
END;
$$;

REVOKE ALL ON FUNCTION downgrade_expired_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION downgrade_expired_subscriptions() TO service_role;

SELECT cron.schedule(
  'downgrade-expired-subscriptions',
  '0 1 * * *',
  $$ SELECT downgrade_expired_subscriptions(); $$
);
