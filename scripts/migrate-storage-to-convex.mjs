/**
 * Copies files still in the Supabase storage buckets into Convex storage
 * (convex/userFiles.ts) and repoints the Supabase rows at them:
 *
 *   documents bucket       → documents.storage_path  ("convex:<storageId>.<ext>")
 *                            documents.file_path     (Contract Review uploads stored their path here)
 *   avatars bucket         → profiles.avatar_url     (Convex file URL)
 *   legal-documents bucket → ghana_laws.file_path    ("convex:<storageId>.<ext>", Admin uploads)
 *                            libraryDocuments.storageId (library/… originals, matched by sourceKey)
 *
 * Each file is recorded under the owner its Supabase row already names
 * (user_id / profile id / uploaded_by). Resumable: rows already pointing at
 * Convex are skipped. Needs the Supabase Storage API (i.e. the project must
 * not be over quota); rows are read/updated over the direct DB connection.
 *
 *   node scripts/migrate-storage-to-convex.mjs --dry-run
 *   node scripts/migrate-storage-to-convex.mjs
 *
 * Env: SUPABASE_DB_URL, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      VITE_CONVEX_URL, INGEST_SECRET.
 */
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { api } from '../convex/_generated/api.js';
import {
  createConvexIngestClient,
  convexUploadFile,
  convexListSourceKeysPaged,
  convexSetStorageId,
} from './lib/convex-ingest-target.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: false, quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', prepare: false, max: 2 });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const convex = createConvexIngestClient();

const logsDir = path.resolve(__dirname, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const logPath = path.join(logsDir, `storage-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
const log = (e) => fs.appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...e }) + '\n');

const totals = { copied: 0, failed: 0 };

// Downloads bucket/objectPath, uploads it to Convex under ownerId, returns { ref, url }.
async function copyObject(bucket, objectPath, ownerId, kind) {
  const { data: blob, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error || !blob) throw new Error(`download ${bucket}/${objectPath}: ${error?.message ?? 'no data'}`);
  const name = objectPath.split('/').pop();
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'bin';
  const storageId = await convexUploadFile(convex, Buffer.from(await blob.arrayBuffer()), blob.type || 'application/octet-stream');
  const url = await convex.client.mutation(api.userFiles.importFile, {
    secret: convex.secret, ownerId, storageId, name, kind,
  });
  return { ref: `convex:${storageId}.${ext}`, url };
}

// Public-bucket URL → object path, e.g. ".../object/public/avatars/<uid>/<f>.png" → "<uid>/<f>.png".
function objectPathFromPublicUrl(url, bucket) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

async function step(label, rows, fn) {
  console.log(`\n${label}: ${rows.length} to copy${DRY_RUN ? ' (dry run)' : ''}`);
  for (const row of rows) {
    if (DRY_RUN) { console.log('  ', JSON.stringify(row)); continue; }
    try {
      await fn(row);
      totals.copied++;
      log({ label, id: row.id, status: 'copied' });
    } catch (err) {
      totals.failed++;
      log({ label, id: row.id, status: 'failed', error: String(err?.message ?? err) });
      console.error(`  ❌ ${label} ${row.id}: ${err?.message ?? err}`);
    }
  }
}

// 1. User documents (Documents page): storage_path is a documents-bucket path.
const docs = await sql`
  SELECT id, user_id, storage_path FROM documents
  WHERE storage_path IS NOT NULL AND storage_path <> '' AND storage_path NOT LIKE 'convex:%'`;
await step('documents.storage_path', docs, async (d) => {
  const { ref } = await copyObject('documents', d.storage_path, d.user_id, 'document');
  await sql`UPDATE documents SET storage_path = ${ref} WHERE id = ${d.id}`;
});

// 2. Contract Review uploads: file_path is "<user_id>/<uuid>.<ext>" in the documents bucket.
const contracts = await sql`
  SELECT id, user_id, file_path FROM documents
  WHERE file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.[A-Za-z0-9]+$'`;
await step('documents.file_path', contracts, async (d) => {
  const { ref } = await copyObject('documents', d.file_path, d.user_id, 'contract');
  await sql`UPDATE documents SET file_path = ${ref} WHERE id = ${d.id}`;
});

// 3. Avatars: profiles.avatar_url is a public avatars-bucket URL.
const avatars = (await sql`SELECT id, avatar_url FROM profiles WHERE avatar_url LIKE '%/storage/v1/object/public/avatars/%'`)
  .map((p) => ({ ...p, objectPath: objectPathFromPublicUrl(p.avatar_url, 'avatars') }))
  .filter((p) => p.objectPath);
await step('profiles.avatar_url', avatars, async (p) => {
  const { url } = await copyObject('avatars', p.objectPath, p.id, 'avatar');
  if (!url) throw new Error('no Convex URL returned');
  await sql`UPDATE profiles SET avatar_url = ${url} WHERE id = ${p.id}`;
});

// 4. Admin uploads: ghana_laws.file_path is a public legal-documents-bucket URL
//    (skipped when the table doesn't exist — Admin.tsx references it, but it
//    isn't in every deployment's schema).
const [{ exists: hasGhanaLaws }] = await sql`SELECT to_regclass('public.ghana_laws') IS NOT NULL AS exists`;
const laws = !hasGhanaLaws ? [] : (await sql`SELECT id, uploaded_by, file_path FROM ghana_laws WHERE file_path LIKE '%/storage/v1/object/public/legal-documents/%'`)
  .map((l) => ({ ...l, objectPath: objectPathFromPublicUrl(l.file_path, 'legal-documents') }))
  .filter((l) => l.objectPath && l.uploaded_by);
await step('ghana_laws.file_path', laws, async (l) => {
  const { ref } = await copyObject('legal-documents', l.objectPath, l.uploaded_by, 'admin');
  await sql`UPDATE ghana_laws SET file_path = ${ref} WHERE id = ${l.id}`;
});

// 5. Legal Library originals: legal-documents bucket objects are named by the
//    same storage path Convex keeps as libraryDocuments.sourceKey. Attach the
//    PDF/DOCX original to any Convex doc still missing one (htm-sourced .txt
//    files are skipped, as in ingest-law-reports.mjs --attach-originals — the
//    viewer shows their chunk text).
const convexDocs = await convexListSourceKeysPaged(convex);
const libraryObjects = await sql`
  SELECT name FROM storage.objects
  WHERE bucket_id = 'legal-documents' AND name LIKE 'library/%'`;
const libraryCounts = { alreadyAttached: 0, textOnly: 0, orphaned: 0 };
const originals = [];
for (const { name } of libraryObjects) {
  const doc = convexDocs.get(name);
  if (!doc) libraryCounts.orphaned++;
  else if (doc.hasStorageId) libraryCounts.alreadyAttached++;
  else if (!/\.(pdf|docx)$/i.test(name)) libraryCounts.textOnly++;
  else originals.push({ id: doc._id, name });
}
console.log(`\nlegal-documents bucket: ${JSON.stringify(libraryCounts)}`);
await step('libraryDocuments.storageId', originals, async (o) => {
  const { data: blob, error } = await supabase.storage.from('legal-documents').download(o.name);
  if (error || !blob) throw new Error(`download legal-documents/${o.name}: ${error?.message ?? 'no data'}`);
  const storageId = await convexUploadFile(convex, Buffer.from(await blob.arrayBuffer()), blob.type || 'application/octet-stream');
  await convexSetStorageId(convex, o.id, storageId);
});

console.log(`\n✅ Done ${JSON.stringify(totals)}${DRY_RUN ? ' (dry run — nothing written)' : `\n   Log: ${path.relative(process.cwd(), logPath)}`}`);
await sql.end();
process.exit(totals.failed ? 1 : 0);
