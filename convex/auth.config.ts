import type { AuthConfig } from "convex/server";

// Auth stays on Supabase; Convex verifies Supabase's access tokens directly.
// The project signs them with an asymmetric ECC (P-256) key (Supabase
// Dashboard → Settings → JWT Keys), published at the JWKS URL below — so
// Convex needs no shared secret. `subject` is the Supabase auth.users.id.
const supabaseUrl = process.env.SUPABASE_URL;

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "authenticated",
      issuer: `${supabaseUrl}/auth/v1`,
      jwks: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      algorithm: "ES256",
    },
  ],
} satisfies AuthConfig;
