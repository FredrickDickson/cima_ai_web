/**
 * Shared rate-limiting helper for CIMA AI Edge Functions, backed by the
 * Postgres fixed-window counter in 20260801000010_rate_limiting.sql. This is
 * separate from AI-action credit deduction (deductAiAction in billing.ts) —
 * credits cap total volume per billing cycle, this caps burst rate.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Throws RATE_LIMITED if `key` has exceeded `limit` requests within the last `windowSeconds`. */
export async function rateLimit(
  supabase: SupabaseClient,
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<void> {
  const { data: withinLimit, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return; // fail open — a rate-limiter outage shouldn't take the whole app down
  if (!withinLimit) throw new Error("RATE_LIMITED");
}

/** Best-effort client IP for callers with no authenticated identity (e.g. before a JWT is resolved, or for public endpoints). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
