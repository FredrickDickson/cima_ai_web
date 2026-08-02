// Permanently deletes the caller's own account. Must run server-side —
// actually deleting the auth.users row requires the service-role admin API,
// which the client can never hold. Every app table's user_id column
// cascades from profiles.id -> auth.users.id (ON DELETE CASCADE, see
// 20260606000000_add_missing_tables_and_rpcs.sql), so deleting the auth
// user alone cleans up profiles, cases, documents, drafts, contract
// analyses, and billing records automatically. Storage objects don't
// participate in that cascade, so user-prefixed paths are best-effort
// cleaned up first.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthedUserId, billingErrorResponse } from "../_shared/billing.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const USER_PREFIXED_BUCKETS = ["avatars", "documents"];

async function deleteUserStorage(supabase: ReturnType<typeof createClient>, userId: string) {
  for (const bucket of USER_PREFIXED_BUCKETS) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(userId);
      if (files && files.length > 0) {
        await supabase.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      // best-effort — don't block account deletion on storage cleanup
    }
  }
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

    // Deliberately tight — this is a one-shot destructive action, not
    // something a legitimate caller ever needs to retry rapidly.
    await rateLimit(supabase, `delete-account:${userId}`, { limit: 3, windowSeconds: 3600 });

    await deleteUserStorage(supabase, userId);

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return new Response(
      JSON.stringify({ success: true }),
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
