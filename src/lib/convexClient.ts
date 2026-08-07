import { ConvexReactClient } from "convex/react";

// Library reads are effectively public (matches the existing Supabase RLS
// policy's actual sensitivity level — see convex/lib/ingestAuth.ts and the
// migration plan's architecture-boundary note), so this uses plain
// ConvexProvider rather than ConvexProviderWithAuth — no Supabase JWT is
// passed through to Convex.
export const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
