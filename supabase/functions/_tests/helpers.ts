import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env" });

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@cima.dev";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "TestPassword123!";

export function functionsUrl(name: string) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

/**
 * The edge functions now verify the caller's session server-side (see
 * supabase/functions/_shared/auth.ts) instead of trusting a client-supplied
 * user_id — so tests need a real logged-in session token, not the anon or
 * service-role key. Signs in as a shared test account (same one the
 * Playwright e2e suite uses, see e2e/helpers/auth.ts), creating it via the
 * admin API on first run if it doesn't exist yet. Cached for the test run.
 */
let cachedToken: string | null = null;

export async function getTestUserToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const signIn = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (signIn.error) {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await admin.auth.admin.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true });
    const retry = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
    if (retry.error || !retry.data.session) {
      throw new Error(`Could not sign in as test user ${TEST_EMAIL}: ${retry.error?.message}`);
    }
    cachedToken = retry.data.session.access_token;
    return cachedToken;
  }

  cachedToken = signIn.data.session!.access_token;
  return cachedToken;
}

export function authHeaders(key?: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key || SUPABASE_ANON_KEY}`,
  };
}
