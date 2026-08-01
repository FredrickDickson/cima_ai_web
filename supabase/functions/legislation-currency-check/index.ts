// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchLawsAfricaSources, COUNTRY_MAP } from "../_shared/laws-africa.ts";
import { getAuthedUserId, billingErrorResponse } from "../_shared/billing.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Previously callable with no auth at all — an open external-API
    // cost/abuse surface. Requires a valid session, matching every other
    // user-facing function.
    const currencyCheckUserId = await getAuthedUserId(req);
    await rateLimit(supabase, `legislation-currency-check:${currencyCheckUserId}`, { limit: 20, windowSeconds: 60 });

    const { doc_id } = await req.json();
    if (!doc_id) throw new Error("doc_id is required");

    const { data: doc, error: docError } = await supabase
      .from("legal_library_documents")
      .select("title, legislation_number, citation, jurisdiction, source_type")
      .eq("id", doc_id)
      .maybeSingle();
    if (docError || !doc) throw new Error("Document not found");
    if (doc.source_type !== "statute") throw new Error("Currency check is only available for legislation documents");

    if (!lawsAfricaKey) throw new Error("Laws.Africa API key not configured");

    const query = doc.legislation_number || doc.citation || doc.title;
    const countryCode = COUNTRY_MAP[(doc.jurisdiction ?? "ghana").toLowerCase()] ?? "gh";

    const results = await fetchLawsAfricaSources(query, lawsAfricaKey, countryCode);

    return new Response(
      JSON.stringify({
        query_used: query,
        matches: results.slice(0, 3),
        checked_at: new Date().toISOString(),
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
