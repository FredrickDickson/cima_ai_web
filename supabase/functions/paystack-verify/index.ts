// Thin wrapper around Paystack's Verify Transaction endpoint, called from
// the /billing/callback page for immediate UI feedback right after a
// customer returns from checkout. The webhook (paystack-webhook) remains
// the source of truth for actually applying the plan/credits — this is
// just so the callback page can show "success"/"failed" without waiting on
// webhook delivery timing.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAuthedUserId, billingErrorResponse } from "../_shared/billing.ts";
import { paystackFetch } from "../_shared/paystack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    await getAuthedUserId(req); // just needs to be a real signed-in user; ownership of the reference isn't re-checked here

    const { reference } = await req.json();
    if (!reference) throw new Error("reference is required");

    const verifyData = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
    });

    return new Response(
      JSON.stringify({
        status: verifyData.data.status,
        amount: verifyData.data.amount,
        currency: verifyData.data.currency,
      }),
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
