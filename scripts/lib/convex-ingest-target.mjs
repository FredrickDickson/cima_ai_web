// Convex write-path for scripts/ingest-law-reports.mjs's `--target=convex`
// mode. Mirrors the Supabase write path (upload → upsert document → replace
// chunks) using the same extraction/chunking/embedding output — only where
// the bytes/rows land changes.
//
// Convex has no admin-auth path on ConvexHttpClient (internalMutation/
// internalQuery are unreachable from outside Convex), so the ingestion-facing
// functions are public mutations gated by a shared secret instead — see
// convex/lib/ingestAuth.ts.

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';

export function createConvexIngestClient() {
  const url = process.env.VITE_CONVEX_URL;
  const secret = process.env.INGEST_SECRET;
  if (!url || !secret) {
    throw new Error(
      'Missing VITE_CONVEX_URL or INGEST_SECRET in .env — required for --target=convex.\n' +
      '  Set INGEST_SECRET to the same value as `npx convex env set INGEST_SECRET <value>`.'
    );
  }
  const client = new ConvexHttpClient(url);
  return { client, secret };
}

export async function convexListSourceKeys({ client, secret }) {
  const keys = await client.query(api.libraryDocuments.listSourceKeys, { secret });
  return new Set(keys);
}

export async function convexUploadFile({ client, secret }, buffer, contentType) {
  const uploadUrl = await client.mutation(api.files.generateUploadUrl, { secret });
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Convex file upload failed: ${res.status} ${await res.text().catch(() => '')}`);
  const { storageId } = await res.json();
  return storageId;
}

export async function convexUpsertDocument({ client, secret }, fields) {
  return await client.mutation(api.libraryDocuments.upsertDocument, { secret, ...fields });
}

export async function convexReplaceChunks({ client, secret }, docId, chunks) {
  // Paginated delete first, then batched insert — both bounded well under
  // Convex's per-mutation transaction limits regardless of document size
  // (see convex/libraryChunks.ts for why this used to be a single collect()
  // + insert-all-at-once).
  let cursor;
  for (;;) {
    const res = await client.mutation(api.libraryChunks.deleteChunksBatch, { secret, docId, cursor });
    if (res.isDone) break;
    cursor = res.continueCursor;
  }

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    inserted += await client.mutation(api.libraryChunks.insertBatch, {
      secret,
      docId,
      chunks: chunks.slice(i, i + BATCH),
    });
  }
  return inserted;
}
