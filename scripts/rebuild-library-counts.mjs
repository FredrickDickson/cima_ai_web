/**
 * Rebuilds Convex `libraryCounts` (the Library sidebar's jurisdiction counts)
 * from `libraryDocuments`. upsertDocument keeps the table in step on every
 * write; run this once after a bulk load (e.g. migrate-legal-library-to-convex.mjs)
 * or if the counts ever look off.
 *
 *   node scripts/rebuild-library-counts.mjs
 *
 * Env: VITE_CONVEX_URL, INGEST_SECRET (same as --target=convex ingestion).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { api } from '../convex/_generated/api.js';
import { createConvexIngestClient } from './lib/convex-ingest-target.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: false, quiet: true });

const { client, secret } = createConvexIngestClient();

let deleted = 0;
for (;;) {
  const res = await client.mutation(api.libraryDocuments.clearCountsBatch, { secret });
  deleted += res.deleted;
  if (res.isDone) break;
}
console.log(`🧹 Cleared ${deleted} count rows`);

let counted = 0;
let cursor = null;
for (;;) {
  const res = await client.mutation(api.libraryDocuments.accumulateCountsPage, {
    secret,
    paginationOpts: { numItems: 500, cursor },
  });
  counted += res.counted;
  if (res.isDone) break;
  cursor = res.continueCursor;
}
console.log(`✅ Counted ${counted} completed documents`);

const totals = await client.query(api.libraryDocuments.jurisdictionCounts, {});
console.log(totals);
