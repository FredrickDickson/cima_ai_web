// Starts a Paystack checkout for a subscription (plan+interval) or an
// AI-action top-up credit pack. Called from the frontend, which then
// redirects the browser to the returned `authorization_url` — this is the
// "Redirect" integration pattern from Paystack's Accept Payments guide, and
// needs no payment SDK on the frontend since Paystack's own checkout page
// handles card entry.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthedUserId, billingErrorResponse } from "../_shared/billing.ts";
import { planAmountPesewa, paystackFetch } from "../_shared/paystack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Illustrative top-up pricing until real per-action cost is confirmed —
// GHS 1.50 per credit, minimum charge GHS 10 (Paystack's own GHS minimum is
// far lower, but a very small top-up isn't worth the transaction fee).
function topupAmountPesewa(credits: number): number {
  return Math.max(Math.round(credits * 1.5 * 100), 1000);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const userId = await getAuthedUserId(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(userId);
    if (userErr || !userRes.user?.email) throw new Error("Could not resolve account email");
    const email = userRes.user.email;

    const { plan, interval, topup_credits } = await req.json();

    const appUrl = Deno.env.get("APP_URL") ?? "https://cimaai.vercel.app";
    let amount: number;
    let metadata: Record<string, unknown>;
    let txType: "subscription" | "topup";

    if (topup_credits) {
      const credits = Number(topup_credits);
      if (!credits || credits <= 0) throw new Error("topup_credits must be a positive number");
      amount = topupAmountPesewa(credits);
      metadata = { user_id: userId, credits };
      txType = "topup";
    } else {
      if (!plan || !interval) throw new Error("plan and interval are required");
      amount = planAmountPesewa(plan, interval);
      metadata = { user_id: userId, plan, interval };
      txType = "subscription";
    }

    const reference = `${txType === "topup" ? "TOPUP" : "SUB"}_${Date.now()}_${userId.slice(0, 8)}`;

    const initData = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount,
        currency: "GHS",
        reference,
        callback_url: `${appUrl}/billing/callback`,
        metadata,
      }),
    });

    await supabase.from("billing_transactions").insert({
      user_id: userId,
      reference,
      type: txType,
      plan: txType === "subscription" ? plan : null,
      amount_kobo: amount,
      currency: "GHS",
      status: "pending",
    });

    return new Response(
      JSON.stringify({ authorization_url: initData.data.authorization_url, reference }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const billingResp = billingErrorResponse(error, corsHeaders);
    if (billingResp) return billingResp;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
