/**
 * Shared billing/plan-gating helpers for CIMA AI Edge Functions.
 *
 * User identity for billing decisions is always derived from the verified
 * JWT (via Supabase Auth), never trusted from the request body — unlike
 * some pre-existing `user_id` body fields elsewhere in this codebase used
 * only to scope which rows to read/write, billing enforcement has real
 * financial consequences, so it must not be spoofable by a tampered body.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function getAuthedUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("UNAUTHENTICATED");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHENTICATED");
  return data.user.id;
}

/** Throws PLAN_RESTRICTED if the user isn't on a paid (pro/max) plan. */
export async function requirePaidPlan(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (!profile || profile.plan === "free") {
    throw new Error("PLAN_RESTRICTED");
  }
}

/** Spends one (or `cost`) AI-action credit for the user. Throws INSUFFICIENT_CREDITS if they're out. */
export async function deductAiAction(supabase: SupabaseClient, userId: string, cost = 1): Promise<void> {
  const { error } = await supabase.rpc("deduct_ai_action", { p_user_id: userId, p_cost: cost });
  if (error) {
    throw new Error(error.message?.includes("INSUFFICIENT_CREDITS") ? "INSUFFICIENT_CREDITS" : error.message);
  }
}

/**
 * Maps a billing-related thrown Error to the right HTTP response, or
 * returns null if `err` isn't a billing error (caller should fall through
 * to its own generic error handling in that case).
 */
export function billingErrorResponse(err: unknown, corsHeaders: Record<string, string>): Response | null {
  const message = err instanceof Error ? err.message : String(err);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (message === "UNAUTHENTICATED") {
    return json({ error: "Please sign in to continue." }, 401);
  }
  if (message === "PLAN_RESTRICTED") {
    return json({ error: "This feature requires a Pro or Max plan.", code: "PLAN_RESTRICTED" }, 403);
  }
  if (message === "INSUFFICIENT_CREDITS") {
    return json({ error: "You've used all your AI actions for this billing cycle.", code: "INSUFFICIENT_CREDITS" }, 402);
  }
  return null;
}
