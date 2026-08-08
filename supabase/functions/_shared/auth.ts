import { createClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http-error.ts";

export interface VerifiedUser {
  id: string;
  email?: string;
}

/**
 * Verifies the caller's Supabase session JWT server-side instead of trusting
 * a client-supplied user_id in the request body. Every edge function used to
 * read user_id straight from req.json() and use it to scope a service-role
 * (RLS-bypassing) query — which let anyone read/write another user's data by
 * simply naming their id. Uses the anon key (not service-role) so the token
 * itself goes through normal Supabase Auth validation.
 */
export async function requireUser(req: Request): Promise<VerifiedUser> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Missing Authorization header");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const anonClient = createClient(supabaseUrl, anonKey);

  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired session");

  return { id: data.user.id, email: data.user.email ?? undefined };
}
