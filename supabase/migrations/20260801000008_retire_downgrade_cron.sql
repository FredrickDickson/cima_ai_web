/*
  # Retire the self-managed subscription-expiry downgrade

  Superseded by real Paystack Subscriptions (see paystack-webhook's
  subscription.disable handling) — Paystack now owns the renewal billing
  cycle and tells us explicitly via webhook when a subscription actually
  ends. The old cron compared `subscription_renews_at` to `now()` and
  downgraded blindly; under real subscriptions that's actively wrong, since
  a webhook-processing delay would incorrectly downgrade a customer whose
  card Paystack is still successfully charging.
*/

SELECT cron.unschedule('downgrade-expired-subscriptions');

DROP FUNCTION IF EXISTS downgrade_expired_subscriptions();
