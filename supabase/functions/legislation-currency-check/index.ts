// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchLawsAfricaSources, COUNTRY_MAP } from "../_shared/laws-africa.ts";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/http-error.ts";
import { requireUUID } from "../_shared/validate.ts";

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const verifiedUser = await requireUser(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    await enforceRateLimit(supabase, verifiedUser.id, "legislation-currency-check", 20, 60);

    const body = await req.json();
    const doc_id = requireUUID(body.doc_id, "doc_id");

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
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return errorResponse(error, cors);
  }
});
