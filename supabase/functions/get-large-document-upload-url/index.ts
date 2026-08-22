import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, HttpError } from "../_shared/http-error.ts";

// First step of the large-document upload flow (see convex/http.ts's
// /generateLargeDocumentUploadUrl and /createLargeDocument, and the
// large-document ingestion plan). The browser uploads the raw file bytes
// directly to the URL this returns — straight to Convex storage, never
// proxied through this function — so a 100MB+ PDF doesn't have to fit
// through a Supabase Edge Function's own request/memory limits twice.
Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const verifiedUser = await requireUser(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await enforceRateLimit(supabase, verifiedUser.id, "get-large-document-upload-url", 10, 60);

    const convexSiteUrl = Deno.env.get("CONVEX_SITE_URL");
    const ingestSecret = Deno.env.get("INGEST_SECRET");
    if (!convexSiteUrl || !ingestSecret) {
      throw new HttpError(500, "Large-document uploads are not configured");
    }

    const res = await fetch(`${convexSiteUrl}/generateLargeDocumentUploadUrl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: ingestSecret }),
    });
    if (!res.ok) {
      throw new HttpError(502, `Failed to get an upload URL (${res.status})`);
    }
    const { uploadUrl } = await res.json();

    return new Response(JSON.stringify({ uploadUrl }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error, cors);
  }
});
