/*
  # Rate limiting — fixed-window counter

  No rate limiting existed anywhere in the app. deduct_ai_action is a usage
  CAP per billing cycle, not a rate limiter — a user could fire all their
  allowed actions in a tight burst with no pacing, and several functions
  (embed-document, ingest-legal-document, legislation-currency-check) had
  neither a cap nor a limit at all. This is a simple Postgres fixed-window
  counter, since there's no Redis/KV available in this stack.

  check_rate_limit(key, limit, window_seconds) atomically increments the
  counter for the current window bucket and returns whether the caller is
  still within the limit. Callers key by authenticated user id where
  available, or by client IP for functions with no user identity (e.g. the
  Paystack webhook, keyed alongside its signature check).
*/

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Old windows accumulate forever otherwise; a cheap periodic prune keeps the
-- table small. Called from the same daily cron as the AI-action reset.
CREATE OR REPLACE FUNCTION prune_rate_limit_hits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limit_hits WHERE window_start < now() - interval '1 day';
$$;

CREATE OR REPLACE FUNCTION check_rate_limit(p_key text, p_limit int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count int;
BEGIN
  v_window_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO rate_limit_hits (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limit_hits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(text, int, int) TO service_role;

REVOKE ALL ON FUNCTION prune_rate_limit_hits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prune_rate_limit_hits() TO service_role;

REVOKE ALL ON rate_limit_hits FROM PUBLIC;

SELECT cron.schedule(
  'prune-rate-limit-hits',
  '30 0 * * *',
  $$ SELECT prune_rate_limit_hits(); $$
);
