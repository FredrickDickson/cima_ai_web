/**
 * Shared guard for the handful of public mutations/queries that exist only
 * for the external ingestion script to call (Convex has no admin-auth path
 * on ConvexHttpClient, so internalMutation/internalQuery are unreachable from
 * outside Convex — these must be public functions, gated by a shared secret
 * instead of Convex's own auth, set via `npx convex env set INGEST_SECRET ...`).
 */
export function requireIngestSecret(secret: string): void {
  const expected = process.env.INGEST_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("Unauthorized: invalid ingest secret");
  }
}
