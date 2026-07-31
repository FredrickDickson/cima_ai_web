/*
  # Billing cron — daily monthly-allowance reset

  Isolated in its own migration (separate from 20260801000005's RPC
  definitions) so that if pg_cron isn't available/permitted on this Supabase
  project's plan, the failure doesn't block the RPCs themselves from being
  applied — reset_monthly_ai_actions() still works fine called manually or
  from a future scheduled invocation until this is resolved.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'reset-monthly-ai-actions',
  '0 0 * * *',
  $$ SELECT reset_monthly_ai_actions(); $$
);

SELECT cron.schedule(
  'downgrade-expired-subscriptions',
  '0 1 * * *',
  $$ SELECT downgrade_expired_subscriptions(); $$
);
