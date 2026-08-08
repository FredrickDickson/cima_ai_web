// deno-lint-ignore no-explicit-any
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http-error.ts";

/**
 * Enforces a per-identifier, per-bucket rate limit via the check_rate_limit
 * Postgres RPC (atomic fixed-window counter — see the rate_limits migration).
 * identifier should be the verified user id from requireUser(); callers that
 * haven't verified a user yet (rare — only the ingest pipeline today) can
 * pass an IP instead. Fails OPEN on an RPC error (logs, lets the request
 * through) so a database hiccup degrades to "no rate limit", not an outage.
 */
export async function enforceRateLimit(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  identifier: string,
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<void> {
  const key = `${bucket}:${identifier}`;
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("enforceRateLimit: check_rate_limit RPC failed, failing open", error);
    return;
  }
  if (data === false) {
    throw new HttpError(429, "Rate limit exceeded — please try again shortly");
  }
}

/** Best-effort caller IP from the standard proxy headers, for the pre-auth case. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
