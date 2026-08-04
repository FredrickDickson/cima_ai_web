/**
 * One-off backfill: strips the www.dennislawgh.com watermark (see
 * scripts/lib/sanitize-legal-text.mjs) from already-ingested rows in
 * legal_library, case_citations, and case_briefs.
 *
 * Runs as a batched Node script rather than a single SQL migration —
 * `UPDATE ... WHERE content ILIKE '%dennislawgh%'` over the full
 * legal_library table has no supporting index and reliably hit the
 * database's statement timeout, both as a raw SQL migration (session-level
 * `SET statement_timeout` didn't survive to the next statement under the
 * migration runner) and as a PostgREST-filtered request (ILIKE substring
 * search still forces a full scan). legal_library is therefore paginated
 * by its primary key (cheap, indexed) instead, filtering for the watermark
 * client-side rather than pushing an ILIKE filter down to Postgres. The
 * much smaller case_citations/case_briefs tables use a plain ILIKE filter,
 * which is fine at their size.
 *
 * Usage:
 *   node scripts/clean-dennislawgh-watermark.mjs --dry-run
 *   node scripts/clean-dennislawgh-watermark.mjs
 *
 * Flags:
 *   --dry-run          Count/report matches only — no writes
 *   --batch-size=N     Rows fetched per round (default 200; legal_library scan uses 1000)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripWatermarks } from './lib/sanitize-legal-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const BATCH_SIZE = Number(argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] ?? 200);

function matches(text) {
  return !!text && text.toLowerCase().includes('dennislawgh');
}

// legal_library is large enough that an ILIKE '%dennislawgh%' filter (no
// supporting index) times out even via PostgREST — so scan it in cheap,
// primary-key-ordered pages instead and filter client-side.
async function cleanLegalLibraryByScan() {
  console.log(`\n📄  legal_library (content) — full paginated scan (no server-side ILIKE)`);
  const PAGE = 1000;
  // Keyset pagination (WHERE id > lastId), not .range()/OFFSET: OFFSET forces
  // Postgres to walk and discard every prior row, which reliably hit the
  // statement timeout past ~40k rows on this table. `id > lastId` uses the
  // primary key index directly and stays cheap regardless of table size.
  let lastId = null;
  let scanned = 0;
  let cleaned = 0;

  while (true) {
    let query = supabase
      .from('legal_library')
      .select('id, content')
      .order('id', { ascending: true })
      .limit(PAGE);
    if (lastId) query = query.gt('id', lastId);
    const { data: rows, error } = await query;

    if (error) {
      console.error(`   ❌  Fetch error after id ${lastId}: ${error.message}`);
      break;
    }
    if (!rows || rows.length === 0) break;

    scanned += rows.length;
    const hits = rows.filter(r => matches(r.content));
    if (hits.length > 0) {
      // Log the actual matched row ids, not the page's pagination cursor —
      // it's easy to misread "after id X" as "row X matched" when X is just
      // where this page started scanning from.
      console.log(`   Page ending at id ${rows[rows.length - 1].id}: ${hits.length} match(es) among rows ${hits.map(r => r.id).join(', ')}`);
      if (!DRY_RUN) {
        for (const row of hits) {
          const { error: updErr } = await supabase
            .from('legal_library')
            .update({ content: stripWatermarks(row.content) })
            .eq('id', row.id);
          if (updErr) {
            console.error(`   ❌  Update failed for ${row.id}: ${updErr.message}`);
            continue;
          }
          cleaned++;
        }
      } else {
        cleaned += hits.length;
      }
    }

    lastId = rows[rows.length - 1].id;
    if (rows.length < PAGE) break; // last page
    process.stdout.write(`   ...scanned ${scanned} rows so far\r`);
  }

  console.log(`\n   Scanned ${scanned} row(s) total. ${DRY_RUN ? 'Would clean' : 'Cleaned'} ${cleaned}.`);
  return cleaned;
}

async function cleanTable(table, idColumn, columns, matchFilter) {
  console.log(`\n📄  ${table} (${columns.join(', ')})`);
  let totalCleaned = 0;
  let round = 0;

  while (true) {
    round++;
    // No offset: each cleaned row stops matching the filter, so always
    // re-fetch the first BATCH_SIZE remaining matches until none are left.
    const { data: rows, error } = await supabase
      .from(table)
      .select([idColumn, ...columns].join(','))
      .or(matchFilter)
      .limit(BATCH_SIZE);

    if (error) {
      console.error(`   ❌  Fetch error: ${error.message}`);
      break;
    }
    if (!rows || rows.length === 0) {
      if (round === 1) console.log('   Nothing to clean.');
      break;
    }

    console.log(`   Round ${round}: ${rows.length} matching row(s)`);
    if (DRY_RUN) {
      totalCleaned += rows.length;
      break; // dry-run: one round is enough to report a count
    }

    for (const row of rows) {
      const update = {};
      for (const col of columns) update[col] = stripWatermarks(row[col] ?? '');
      const { error: updErr } = await supabase.from(table).update(update).eq(idColumn, row[idColumn]);
      if (updErr) {
        console.error(`   ❌  Update failed for ${row[idColumn]}: ${updErr.message}`);
        continue;
      }
      totalCleaned++;
    }
  }

  console.log(`   ${DRY_RUN ? 'Would clean' : 'Cleaned'} ${totalCleaned} row(s) in ${table}.`);
  return totalCleaned;
}

async function main() {
  console.log('🧹  Dennislawgh watermark backfill');
  console.log(`    Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}, batch size ${BATCH_SIZE}`);

  const results = {};
  results.legal_library = await cleanLegalLibraryByScan();
  results.case_citations = await cleanTable('case_citations', 'id', ['context_snippet', 'reasoning'],
    'context_snippet.ilike.%dennislawgh%,reasoning.ilike.%dennislawgh%');
  results.case_briefs = await cleanTable('case_briefs', 'doc_id', ['facts', 'holding', 'procedural_history', 'raw_model_output'],
    'facts.ilike.%dennislawgh%,holding.ilike.%dennislawgh%,procedural_history.ilike.%dennislawgh%,raw_model_output.ilike.%dennislawgh%');

  console.log('\n✅  Done.', results);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
