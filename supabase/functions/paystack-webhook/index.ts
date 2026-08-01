// Public endpoint — Paystack calls this directly, so it CANNOT require our
// normal Supabase JWT auth (see supabase/config.toml's [functions.paystack-webhook]
// verify_jwt = false, the first such exception in this repo). Every event is
// verified via the x-paystack-signature HMAC before anything is trusted —
// see docs/Paystack docs/webhooks.md's "Verify event origin" section.
//
// We use Paystack's native Subscription/Plan objects (see paystack-initialize
// and docs/Paystack docs/Subscriptions.md) — Paystack owns the recurring
// billing cycle from here, and tells us what happened via these events:
//   charge.success       — a transaction WE initiated succeeded (first
//                           subscription payment, or a topup). Carries our
//                           own `metadata` since we set it at initialize time.
//   subscription.create  — fired once, right after the first payment
//                           subscribes the customer. No metadata — only
//                           email — so we resolve user_id via
//                           find_user_id_by_email().
//   invoice.update       — fired after every recurring (2nd+ cycle) charge
//                           attempt, success or not, with the final outcome.
//                           This is the actual renewal signal.
//   invoice.payment_failed — a recurring charge attempt failed.
//   subscription.disable — the subscription ended (cancelled or completed).
// subscription.not_renew / invoice.create / subscription.expiring_cards are
// acknowledged but not acted on (out of scope for this pass).
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
    } else if (event.event === "subscription.create") {
      const data = event.data;
      const email = data.customer?.email;
      if (email) {
        const { data: userId } = await supabase.rpc("find_user_id_by_email", { p_email: email });
        if (userId) {
          await supabase
            .from("profiles")
            .update({
              subscription_code: data.subscription_code,
              paystack_customer_code: data.customer?.customer_code ?? null,
              subscription_renews_at: data.next_payment_date ?? null,
            })
            .eq("id", userId);
        } else {
          console.error("subscription.create: no profile found for email", email);
        }
      }
    } else if (event.event === "invoice.update") {
      const data = event.data;
      const subscriptionCode = data.subscription?.subscription_code;
      if (subscriptionCode && data.paid) {
        const authorizationCode = data.authorization?.authorization_code ?? null;
        const { data: rows } = await supabase
          .from("profiles")
          .update({
            plan_status: "active",
            monthly_ai_actions_used: 0,
            subscription_renews_at: data.subscription?.next_payment_date ?? null,
            ...(authorizationCode ? { paystack_authorization_code: authorizationCode } : {}),
          })
          .eq("subscription_code", subscriptionCode)
          .select("id, plan");

        const row = rows?.[0];
        if (row && data.transaction?.reference) {
          await supabase.from("billing_transactions").insert({
            user_id: row.id,
            reference: data.transaction.reference,
            type: "subscription",
            plan: row.plan,
            amount_kobo: data.amount ?? data.transaction.amount ?? 0,
            currency: data.transaction.currency ?? "GHS",
            status: "success",
          });
        }
      }
    } else if (event.event === "invoice.payment_failed") {
      const subscriptionCode = event.data?.subscription?.subscription_code;
      if (subscriptionCode) {
        await supabase.from("profiles").update({ plan_status: "past_due" }).eq("subscription_code", subscriptionCode);
      }
    } else if (event.event === "subscription.disable") {
      const subscriptionCode = event.data?.subscription_code;
      if (subscriptionCode) {
        await supabase
          .from("profiles")
          .update({ plan: "free", plan_status: "active", subscription_code: null, subscription_renews_at: null })
          .eq("subscription_code", subscriptionCode);
      }
    }
  } catch (err) {
    console.error("paystack-webhook processing error:", err);
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});
