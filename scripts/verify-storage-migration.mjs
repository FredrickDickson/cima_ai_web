/**
 * Checks that scripts/migrate-storage-to-convex.mjs left nothing pointing at
 * the Supabase storage buckets, and that a sample of the "convex:<storageId>"
 * refs resolve to a file in Convex storage. Read-only on both sides.
 *
 *   node scripts/verify-storage-migration.mjs --sample=20
 */
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: false, quiet: true });

const argv = process.argv.slice(2);
const SAMPLE = Number(argv.find((a) => a.startsWith('--sample='))?.split('=')[1] ?? 20);

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', prepare: false, max: 2 });
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

let bad = 0;
function expectNone(label, rows) {
  console.log(`${rows.length ? '✗' : '✓'} ${label}: ${rows.length} still on Supabase storage`);
  for (const r of rows.slice(0, 5)) console.log('    ', JSON.stringify(r));
  if (rows.length) bad++;
}

// 1. Rows still referencing a Supabase bucket (same selectors as the migration script).
expectNone('documents.storage_path', await sql`
  SELECT id, storage_path FROM documents
  WHERE storage_path IS NOT NULL AND storage_path <> '' AND storage_path NOT LIKE 'convex:%'`);
expectNone('documents.file_path', await sql`
  SELECT id, file_path FROM documents
  WHERE file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.[A-Za-z0-9]+$'`);
expectNone('profiles.avatar_url', await sql`
  SELECT id, avatar_url FROM profiles WHERE avatar_url LIKE '%/storage/v1/object/%'`);
const [{ exists: hasGhanaLaws }] = await sql`SELECT to_regclass('public.ghana_laws') IS NOT NULL AS exists`;
if (hasGhanaLaws) {
  expectNone('ghana_laws.file_path', await sql`
    SELECT id, file_path FROM ghana_laws WHERE file_path LIKE '%/storage/v1/object/%'`);
}

// 2. Sample of convex: refs — each must resolve to a stored file.
const refs = await sql`
  SELECT id, ref FROM (
    SELECT id, storage_path AS ref FROM documents WHERE storage_path LIKE 'convex:%'
    UNION ALL
    SELECT id, file_path AS ref FROM documents WHERE file_path LIKE 'convex:%'
  ) r ORDER BY random() LIMIT ${SAMPLE}`;
let missing = 0;
for (const { id, ref } of refs) {
  const rest = ref.slice('convex:'.length);
  const storageId = rest.includes('.') ? rest.slice(0, rest.indexOf('.')) : rest;
  const url = await convex.query(api.libraryDocuments.getFileUrl, { storageId }).catch(() => null);
  if (!url) {
    missing++;
    console.log(`    ✗ documents ${id}: ${ref} has no file in Convex storage`);
  }
}
console.log(`${missing ? '✗' : '✓'} convex: refs sampled: ${refs.length}, missing: ${missing}`);
if (missing) bad++;

console.log(bad ? `\n❌ ${bad} check(s) failed` : '\n✅ All checks passed');
await sql.end();
process.exit(bad ? 1 : 0);
