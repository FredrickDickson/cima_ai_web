import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, HttpError } from "../_shared/http-error.ts";
import { requireString } from "../_shared/validate.ts";

// Second step of the large-document upload flow — called after the browser
// has already uploaded raw bytes directly to the Convex storage URL from
// get-large-document-upload-url. Creates the document row with a *verified*
// Supabase user id (never trusted from the client) and kicks off the
// resumable sharding/extraction/chunking pipeline
// (convex/largeDocumentIngestion.ts).
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

    await enforceRateLimit(supabase, verifiedUser.id, "create-large-document", 10, 60);

    const body = await req.json();
    const name = requireString(body.name, "name", { maxLength: 500 });
    const storageId = requireString(body.storageId, "storageId", { maxLength: 200 });

    const convexSiteUrl = Deno.env.get("CONVEX_SITE_URL");
    const ingestSecret = Deno.env.get("INGEST_SECRET");
    if (!convexSiteUrl || !ingestSecret) {
      throw new HttpError(500, "Large-document uploads are not configured");
    }

    const res = await fetch(`${convexSiteUrl}/createLargeDocument`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: ingestSecret, ownerId: verifiedUser.id, name, storageId }),
    });
    if (!res.ok) {
      throw new HttpError(502, `Failed to create the document (${res.status})`);
    }
    const { docId } = await res.json();

    return new Response(JSON.stringify({ docId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error, cors);
  }
});
