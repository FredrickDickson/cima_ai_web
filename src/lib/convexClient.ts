import { ConvexReactClient } from "convex/react";

// Wrapped in <ConvexProviderWithAuth> (src/main.tsx), which passes the
// signed-in user's Supabase access token to Convex (src/lib/convexAuth.ts,
// verified by convex/auth.config.ts) — needed for user file storage
// (convex/userFiles.ts). Library reads stay public and work signed out too.
export const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
