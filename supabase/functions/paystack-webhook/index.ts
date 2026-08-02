// Public endpoint — Paystack calls this directly, so it CANNOT require our
// normal Supabase JWT auth (see supabase/config.toml's [functions.paystack-webhook]
// verify_jwt = false, the first such exception in this repo). Every event is
// verified via the x-paystack-signature HMAC before anything is trusted —
// see docs/Paystack docs/webhooks.md's "Verify event origin" section.
//
// Deliberately NOT using Paystack's native Subscription/Plan objects (see
// paystack-initialize) — recurring billing needs a reusable authorization,
// which only cards (and Nigeria direct debit) support, and most users here
// pay via Mobile Money. Every plan purchase is a plain one-off charge, so
// the only event that ever matters is charge.success — it self-tracks
// subscription_renews_at by adding one billing period, with no auto-renewal
// for any payment method. downgrade_expired_subscriptions() (run daily via
// cron, see the accompanying migration) reverts to Free once that date
// passes without a repeat charge.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, clientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Paystack-Signature",
};

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // IP-based backstop against signature-guessing brute force, ahead of the
  // (comparatively expensive) HMAC verification below — the signature check
  // remains the real gate, this just caps request volume from one source.
  try {
    await rateLimit(supabase, `paystack-webhook:${clientIp(req)}`, { limit: 60, windowSeconds: 60 });
  } catch {
    return new Response("Too many requests", { status: 429, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

  const valid = !!secretKey && !!signature && (await verifySignature(rawBody, signature, secretKey));
  if (!valid) {
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  // deno-lint-ignore no-explicit-any
  let event: { event: string; data: any };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders });
  }

  // Process synchronously (our work here is a few fast DB writes, well
  // within Paystack's timeout) then always acknowledge with 200 — a DB
  // hiccup is logged for manual reconciliation rather than left to Paystack's
  // retry loop, since retried webhooks would otherwise double-credit a user.
  try {
    if (event.event === "charge.success") {
      const data = event.data;
      const metadata = data.metadata ?? {};
      const userId = metadata.user_id;
      const reference = data.reference;

      if (userId && reference) {
        // Idempotency: a resent valid webhook (retry/replay) for a reference
        // already marked success must not double-credit AI actions or
        // re-extend a subscription — only apply the side effects once.
        const { data: existing } = await supabase
          .from("billing_transactions")
          .select("status")
          .eq("reference", reference)
          .maybeSingle();
        const alreadyProcessed = existing?.status === "success";

        await supabase.from("billing_transactions").update({ status: "success" }).eq("reference", reference);

        if (alreadyProcessed) {
          // skip re-applying credits/plan changes below
        } else if (metadata.credits) {
          await supabase.rpc("add_extra_ai_actions", { p_user_id: userId, p_amount: Number(metadata.credits) });
        } else if (metadata.plan) {
          const months = metadata.interval === "annually" ? 12 : 1;
          const renewsAt = new Date();
          renewsAt.setMonth(renewsAt.getMonth() + months);
          const authorizationCode = data.authorization?.authorization_code ?? null;

          await supabase
            .from("profiles")
            .update({
              plan: metadata.plan,
              plan_status: "active",
              monthly_ai_actions_used: 0,
              monthly_ai_actions_reset_at: renewsAt.toISOString(),
              subscription_renews_at: renewsAt.toISOString(),
              paystack_authorization_code: authorizationCode,
            })
            .eq("id", userId);
        }
      }
    }
  } catch (err) {
    console.error("paystack-webhook processing error:", err);
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});
