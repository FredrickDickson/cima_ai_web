/**
 * Spot-checks migrated docs: for N docs (random, or from a migration log),
 * compares Convex vs Supabase chunk count + SHA-256 of all chunk content in
 * order, and checks the legacy-UUID lookup. Read-only on both sides.
 *
 *   node scripts/verify-legal-library-migration.mjs --sample=20
 *   node scripts/verify-legal-library-migration.mjs --log=scripts/logs/<file>.jsonl --sample=5
 */
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: false, quiet: true });

const argv = process.argv.slice(2);
const flag = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const SAMPLE = Number(flag('sample') ?? 20);
const LOG = flag('log');

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', prepare: false, max: 2 });
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
const sha = (parts) => crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex');

let ids;
if (LOG) {
  ids = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((e) => e.status === 'completed' && e.legacyId).map((e) => e.legacyId).slice(0, SAMPLE);
} else {
  ids = (await sql`SELECT id FROM legal_library_documents WHERE ingestion_status = 'completed' ORDER BY random() LIMIT ${SAMPLE}`).map((r) => r.id);
}

let ok = 0, bad = 0;
for (const id of ids) {
  const doc = await convex.query(api.libraryDocuments.getByLegacyId, { legacyId: id });
  if (!doc) { console.log(`✗ ${id}: not found in Convex by legacyId`); bad++; continue; }
  const cChunks = [];
  let cursor = null;
  for (;;) {
    const res = await convex.query(api.libraryDocuments.getChunksPage, { docId: doc._id, paginationOpts: { numItems: 500, cursor } });
    cChunks.push(...res.page);
    if (res.isDone) break;
    cursor = res.continueCursor;
  }
  cChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  const sRows = await sql`SELECT content FROM legal_library WHERE doc_id = ${id} ORDER BY chunk_index NULLS LAST, created_at, id`;
  const same = cChunks.length === sRows.length && sha(cChunks.map((c) => c.content)) === sha(sRows.map((r) => r.content ?? ''));
  console.log(`${same ? '✓' : '✗'} ${doc.title.slice(0, 60)} — convex ${cChunks.length} / supabase ${sRows.length} chunks`);
  same ? ok++ : bad++;
}
console.log(`\n${ok} match, ${bad} mismatch`);
await sql.end();
process.exit(bad ? 1 : 0);
