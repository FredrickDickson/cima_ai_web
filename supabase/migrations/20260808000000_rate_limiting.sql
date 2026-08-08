/*
  Rate limiting for the Supabase Edge Functions (all currently unauthenticated
  and unlimited — see the security audit). Postgres-backed fixed-window
  counter: no new infra/secrets, atomic under concurrency via a single
  INSERT ... ON CONFLICT statement.

  check_rate_limit(key, limit, window_seconds) increments the counter for the
  current window (window boundary = floor(now()/window_seconds), so all
  requests within the same window share one row) and returns whether the
  caller is still within `limit` requests for it.

  NOTE: rate_limit_hits + check_rate_limit already existed live on this
  project (created out-of-band, never captured in a migration) — this
  migration formally captures that existing shape into version control
  instead of introducing a second, differently-named table/function.
*/

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
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
