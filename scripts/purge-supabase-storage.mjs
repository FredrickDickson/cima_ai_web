/**
 * Last step of the Supabase → Convex storage move (after
 * migrate-storage-to-convex.mjs + verify-storage-migration.mjs pass): backs up
 * every object in the old buckets to a local folder, then deletes the objects
 * and the buckets via the Storage API (Supabase blocks direct SQL deletes on
 * its storage tables). Migration 20261001000000 drops the buckets' policies.
 *
 *   node scripts/purge-supabase-storage.mjs --backup-dir=<dir>            # back up only
 *   node scripts/purge-supabase-storage.mjs --backup-dir=<dir> --delete   # back up, then delete
 *
 * Resumable: files already in the backup with the right size are skipped.
 * Deletion only starts once every object is backed up.
 *
 * Env: SUPABASE_DB_URL, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: false, quiet: true });

const argv = process.argv.slice(2);
const BACKUP_DIR = argv.find((a) => a.startsWith('--backup-dir='))?.split('=').slice(1).join('=');
const DELETE = argv.includes('--delete');
if (!BACKUP_DIR) {
  console.error('❌ --backup-dir=<dir> is required');
  process.exit(1);
}

const BUCKETS = ['documents', 'avatars', 'legal-documents'];
const CONCURRENCY = Number(argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? 8);

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', prepare: false, max: 2 });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const objects = await sql`
  SELECT bucket_id, name, (metadata->>'size')::bigint AS size
  FROM storage.objects WHERE bucket_id IN ${sql(BUCKETS)} ORDER BY bucket_id, name`;
console.log(`${objects.length} objects in ${BUCKETS.join(', ')}`);

// 1. Back up.
const failed = [];
let done = 0, skipped = 0;
async function backup(o) {
  const dest = path.join(BACKUP_DIR, o.bucket_id, ...o.name.split('/'));
  if (fs.existsSync(dest) && fs.statSync(dest).size === Number(o.size)) { skipped++; return; }
  const { data: blob, error } = await supabase.storage.from(o.bucket_id).download(o.name);
  // Storage errors from a non-JSON response carry the Response, not a message.
  if (error || !blob) throw new Error(error?.originalError?.status ? `HTTP ${error.originalError.status}` : error?.message || 'no data');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await blob.arrayBuffer()));
}
const queue = [...objects];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let o = queue.shift(); o; o = queue.shift()) {
    try { await backup(o); } catch (err) { failed.push(`${o.bucket_id}/${o.name}: ${err.message}`); }
    if (++done % 500 === 0) console.log(`  backed up ${done}/${objects.length}`);
  }
}));
console.log(`Backup: ${objects.length - failed.length} ok (${skipped} already present), ${failed.length} failed → ${BACKUP_DIR}`);
if (failed.length) {
  failed.slice(0, 10).forEach((f) => console.error('  ❌', f));
  console.error('Not deleting anything until every object is backed up — re-run to retry.');
  await sql.end();
  process.exit(1);
}

// 2. Delete (only with --delete, only after a complete backup).
if (DELETE) {
  for (const bucket of BUCKETS) {
    const names = objects.filter((o) => o.bucket_id === bucket).map((o) => o.name);
    for (let i = 0; i < names.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(names.slice(i, i + 100));
      if (error) throw new Error(`remove ${bucket}: ${error.message}`);
    }
    console.log(`Deleted ${names.length} objects from ${bucket}`);
  }
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id IN ${sql(BUCKETS)}`;
  if (n !== 0) {
    console.error(`⚠️ ${n} objects remain — buckets kept`);
    await sql.end();
    process.exit(1);
  }
  for (const bucket of BUCKETS) {
    const { error } = await supabase.storage.deleteBucket(bucket);
    if (error) throw new Error(`deleteBucket ${bucket}: ${error.message}`);
  }
  console.log(`✅ Buckets emptied and deleted: ${BUCKETS.join(', ')}`);
}

await sql.end();
