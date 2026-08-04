/**
 * One-off backfill: strips the www.dennislawgh.com watermark (see
 * convex/lib/sanitizeText.ts) from already-ingested libraryChunks.content in
 * Convex — the counterpart to scripts/clean-dennislawgh-watermark.mjs, which
 * only covers Supabase. Drives convex/libraryChunks.ts's stripWatermarksBatch
 * mutation page by page (server does the scan+patch per page; this script
 * just loops the cursor and reports progress).
 *
 * Usage:
 *   node scripts/clean-dennislawgh-watermark-convex.mjs --dry-run
 *   node scripts/clean-dennislawgh-watermark-convex.mjs
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { api } from '../convex/_generated/api.js';
import { createConvexIngestClient } from './lib/convex-ingest-target.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: false });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('🧹  Dennislawgh watermark backfill (Convex)');
  console.log(`    Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);

  const { client, secret } = createConvexIngestClient();

  let cursor;
  let totalScanned = 0;
  let totalCleaned = 0;
  let round = 0;
  let result;

  do {
    round++;
    result = await client.mutation(api.libraryChunks.stripWatermarksBatch, {
      secret,
      cursor,
      dryRun: DRY_RUN,
    });
    totalScanned += result.scanned;
    totalCleaned += result.cleaned;
    cursor = result.continueCursor;
    console.log(`   Page ${round}: scanned ${result.scanned}, ${DRY_RUN ? 'would clean' : 'cleaned'} ${result.cleaned} (running total: scanned ${totalScanned}, ${DRY_RUN ? 'would clean' : 'cleaned'} ${totalCleaned})`);
  } while (!result.isDone);

  console.log(`\n✅  Done. Scanned ${totalScanned} chunk(s) total. ${DRY_RUN ? 'Would clean' : 'Cleaned'} ${totalCleaned}.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
