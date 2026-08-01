// Thin wrapper around Paystack's hosted subscription-management page
// (GET /subscription/:code/manage/link) — lets a Pro/Max user update their
// card or cancel directly on Paystack's own page, per
// docs/Paystack docs/Subscriptions.md "Updating the card on a subscription".
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthedUserId, billingErrorResponse } from "../_shared/billing.ts";
import { paystackFetch } from "../_shared/paystack.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

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
    const userId = await getAuthedUserId(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    await rateLimit(supabase, `paystack-manage-link:${userId}`, { limit: 20, windowSeconds: 60 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_code")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.subscription_code) {
      throw new Error("No active subscription to manage");
    }

    const linkData = await paystackFetch(`/subscription/${encodeURIComponent(profile.subscription_code)}/manage/link`, {
      method: "GET",
    });

    return new Response(
      JSON.stringify({ link: linkData.data.link }),
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
