/**
 * Copies the Supabase legal library (`legal_library_documents` + the 1.2 GB
 * `legal_library` chunk table) into Convex (`libraryDocuments` +
 * `libraryChunks`), so the Supabase tables can be dropped and the project
 * gets back under its DB-size quota.
 *
 * Reads Postgres DIRECTLY (not the REST API) because the REST API is blocked
 * while the project is over quota. Writes via the same secret-gated Convex
 * mutations as `ingest-law-reports.mjs --target=convex`.
 *
 * Usage:
 *   node scripts/migrate-legal-library-to-convex.mjs --profile         # read-only data profile, no writes
 *   node scripts/migrate-legal-library-to-convex.mjs --dry-run --limit=20
 *   node scripts/migrate-legal-library-to-convex.mjs --limit=50        # small live run
 *   node scripts/migrate-legal-library-to-convex.mjs                   # full run (resumable)
 *
 * Flags:
 *   --profile            Print row counts / null counts / distinct enum values, then exit
 *   --dry-run            Read + map everything, write nothing to Convex
 *   --limit=N            Migrate at most N documents this run
 *   --concurrency=N      Documents migrated in parallel (default 4)
 *   --batch-size=N       Chunks per Convex insert mutation (default 200)
 *   --skip-orphans       Don't migrate chunks whose doc_id is NULL
 *   --id=<uuid>          Migrate just this one legal_library_documents row
 *
 * Env (.env / .env.local):
 *   SUPABASE_DB_URL      Postgres connection string (Dashboard → Connect → Session pooler)
 *   VITE_CONVEX_URL, INGEST_SECRET   (same as --target=convex ingestion)
 *
 * Resumable: docs already `completed` in Convex (matched by sourceKey) are
 * skipped; anything else is (re)written — convexReplaceChunks clears a doc's
 * chunks before inserting, so a crashed half-written doc is simply redone.
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { api } from '../convex/_generated/api.js';
import {
  createConvexIngestClient,
  convexListSourceKeysPaged,
  convexUpsertDocument,
  convexReplaceChunks,
} from './lib/convex-ingest-target.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: false });

// ─── CLI ARGS ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const PROFILE = argv.includes('--profile');
const DRY_RUN = argv.includes('--dry-run');
const SKIP_ORPHANS = argv.includes('--skip-orphans');
const ONLY_ID = flag('id');
const LIMIT = Number(flag('limit') ?? 0) || Infinity;
const CONCURRENCY = Number(flag('concurrency') ?? 4);
const BATCH_SIZE = Number(flag('batch-size') ?? 200);
const EMBEDDING_DIMS = 384;

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error(
    '❌  Missing SUPABASE_DB_URL in .env — copy the "Session pooler" connection string from\n' +
      '    Supabase Dashboard → Connect, with your database password filled in.',
  );
  process.exit(1);
}

// Supabase's session pooler caps clients at 15, so workers share a smaller
// pool rather than holding one connection each (queries queue briefly).
const sql = postgres(DB_URL, { ssl: 'require', max: Math.min(CONCURRENCY + 1, 10), prepare: false, idle_timeout: 30 });

// ─── PROFILE (read-only) ───────────────────────────────────────────────────

if (PROFILE) {
  const [docs] = await sql`SELECT count(*)::int AS n FROM legal_library_documents`;
  const [chunks] = await sql`
    SELECT count(*)::int AS n,
           count(*) FILTER (WHERE doc_id IS NULL)::int AS orphans,
           count(*) FILTER (WHERE embedding IS NULL)::int AS no_embedding,
           count(*) FILTER (WHERE chunk_index IS NULL)::int AS no_chunk_index,
           max(length(content))::int AS max_content_len
    FROM legal_library`;
  const docTypes = await sql`SELECT source_type, count(*)::int AS n FROM legal_library_documents GROUP BY 1 ORDER BY 2 DESC`;
  const chunkTypes = await sql`SELECT source_type, count(*)::int AS n FROM legal_library GROUP BY 1 ORDER BY 2 DESC`;
  const formats = await sql`SELECT original_format, count(*)::int AS n FROM legal_library_documents GROUP BY 1 ORDER BY 2 DESC`;
  const statuses = await sql`SELECT ingestion_status, count(*)::int AS n FROM legal_library_documents GROUP BY 1 ORDER BY 2 DESC`;
  const noPath = await sql`SELECT count(*)::int AS n FROM legal_library_documents WHERE storage_path IS NULL`;
  const orphanGroups = await sql`
    SELECT count(*)::int AS n FROM (SELECT 1 FROM legal_library WHERE doc_id IS NULL GROUP BY title, citation) g`;
  console.log(JSON.stringify(
    {
      documents: docs.n,
      documentsWithoutStoragePath: noPath[0].n,
      chunks,
      orphanDocGroups: orphanGroups[0].n,
      documentSourceTypes: docTypes,
      chunkSourceTypes: chunkTypes,
      originalFormats: formats,
      ingestionStatuses: statuses,
    },
    null,
    2,
  ));
  await sql.end();
  process.exit(0);
}

// ─── MAPPING ───────────────────────────────────────────────────────────────

const blankToUndef = (s) => (s === null || s === undefined || String(s).trim() === '' ? undefined : String(s));

// Convex only knows 'case' | 'statute'. Anything else must be mapped
// deliberately — fail loudly (dry-run surfaces these) rather than guess.
function mapSourceType(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (['case', 'cases', 'judgment', 'case_law'].includes(s)) return 'case';
  // 'rule' = the CIMA arbitration rules (scripts/ingest-cima-rules.mjs) — legislation-like.
  if (['statute', 'statutes', 'legislation', 'act', 'regulation', 'rule', 'rules', 'constitution'].includes(s)) return 'statute';
  throw new Error(`Unmapped source_type "${raw}" — add it to mapSourceType()`);
}

function mapFormat(raw, storagePath) {
  const f = String(raw ?? '').trim().toLowerCase();
  if (f === 'docx' || f === 'pdf' || f === 'htm-text') return f;
  const ext = path.extname(storagePath ?? '').toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  return 'htm-text'; // text-only viewer — the safe default when there's no original
}

function mapStatus(raw) {
  const s = String(raw ?? '').trim();
  return ['pending', 'processing', 'completed', 'failed'].includes(s) ? s : 'completed';
}

function mapParties(raw) {
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? safeJson(raw, []) : [];
  return arr
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({ role: String(p.role ?? ''), name: String(p.name ?? '') }))
    .filter((p) => p.name);
}

function safeJson(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

// pgvector comes back as text "[0.1,0.2,...]" (we select embedding::text).
function parseEmbedding(text) {
  if (!text) return undefined;
  const vec = safeJson(text, null);
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS || vec.some((x) => typeof x !== 'number')) {
    return undefined; // bad/odd vector → store without it; FTS still covers the chunk
  }
  return vec;
}

// Drops undefined keys — optional Convex validators want the key absent, not null.
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

function mapChunk(row, fallbackIndex) {
  return compact({
    chunkIndex: row.chunk_index ?? fallbackIndex,
    title: row.title ?? '',
    citation: blankToUndef(row.citation),
    content: row.content ?? '',
    embedding: parseEmbedding(row.embedding),
    sourceType: String(row.source_type ?? ''),
    jurisdiction: String(row.jurisdiction ?? 'ghana'),
  });
}

// ─── LOGGING ───────────────────────────────────────────────────────────────

const logsDir = path.resolve(__dirname, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(logsDir, `legal-library-migration-${runStamp}.jsonl`);
const logStream = DRY_RUN ? null : fs.createWriteStream(logPath, { flags: 'a' });
function log(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  if (logStream) logStream.write(line + '\n');
  if (entry.status === 'failed') console.error(`  ❌ ${entry.key}: ${entry.error}`);
}

// ─── MIGRATION ─────────────────────────────────────────────────────────────

// One client per worker: ConvexHttpClient queues mutations and runs them one
// at a time, so a single shared client would serialize every worker's writes.
const clients = Array.from({ length: Math.max(1, CONCURRENCY) }, () => createConvexIngestClient());
console.log('📋 Loading existing Convex source keys…');
const existing = await convexListSourceKeysPaged(clients[0]);
console.log(`   ${existing.size} docs already in Convex`);

const totals = { migrated: 0, skipped: 0, linked: 0, failed: 0, chunks: 0, chunksWithoutEmbedding: 0 };

async function writeDoc(convex, key, fields, chunkRows, legacyId) {
  const chunks = chunkRows.map((r, i) => mapChunk(r, i));
  const noEmb = chunks.filter((c) => !c.embedding).length;
  if (DRY_RUN) {
    totals.migrated++;
    totals.chunks += chunks.length;
    totals.chunksWithoutEmbedding += noEmb;
    return;
  }
  const docId = await convexUpsertDocument(convex, compact({ ...fields, legacyId, ingestionStatus: 'processing' }));
  const inserted = await convexReplaceChunks(convex, docId, chunks, BATCH_SIZE);
  if (inserted !== chunks.length) throw new Error(`inserted ${inserted}/${chunks.length} chunks`);
  await convexUpsertDocument(convex, compact({ ...fields, legacyId }));
  totals.migrated++;
  totals.chunks += inserted;
  totals.chunksWithoutEmbedding += noEmb;
  log({ key, status: 'completed', docId, legacyId, chunks: inserted });
}

async function migrateDocument(doc, worker) {
  const convex = clients[worker];
  const key = doc.storage_path ?? `legacy:${doc.id}`;
  try {
    const prior = existing.get(key);
    if (prior?.ingestionStatus === 'completed') {
      // Already in Convex (e.g. ingested there directly) — just back-link the UUID.
      if (!prior.hasLegacyId && !DRY_RUN) {
        await convex.client.mutation(api.libraryDocuments.setLegacyId, {
          secret: convex.secret,
          docId: prior._id,
          legacyId: doc.id,
        });
        totals.linked++;
      }
      totals.skipped++;
      return;
    }
    const chunkRows = await sql`
      SELECT title, content, embedding::text AS embedding, source_type, jurisdiction, citation, chunk_index
      FROM legal_library WHERE doc_id = ${doc.id}
      ORDER BY chunk_index NULLS LAST, created_at, id`;
    const fields = {
      title: doc.title || '(untitled)',
      sourceType: mapSourceType(doc.source_type),
      jurisdiction: doc.jurisdiction || 'ghana',
      citation: blankToUndef(doc.citation),
      court: blankToUndef(doc.court),
      decidedYear: doc.decided_year ?? undefined,
      parties: mapParties(doc.parties),
      legislationNumber: blankToUndef(doc.legislation_number),
      originalFormat: mapFormat(doc.original_format, doc.storage_path),
      sourceCollection: blankToUndef(doc.source_collection),
      extractedCharCount: doc.extracted_char_count ?? 0,
      ingestionStatus: mapStatus(doc.ingestion_status),
      errorMessage: blankToUndef(doc.error_message),
      sourceKey: key,
    };
    await writeDoc(convex, key, fields, chunkRows, doc.id);
  } catch (err) {
    totals.failed++;
    log({ key, status: 'failed', legacyId: doc.id, error: String(err?.message ?? err) });
  }
}

// Chunks whose doc_id is NULL (older ingests that pre-date
// legal_library_documents) → one synthetic doc per (title, citation).
async function migrateOrphans(remaining) {
  const groups = await sql`
    SELECT title, citation, min(source_type) AS source_type, min(jurisdiction) AS jurisdiction,
           sum(length(content))::int AS chars
    FROM legal_library WHERE doc_id IS NULL
    GROUP BY title, citation ORDER BY title, citation`;
  console.log(`🧩 ${groups.length} orphan chunk groups`);
  await pool(groups.slice(0, remaining), async (g, worker) => {
    const hash = crypto.createHash('sha1').update(`${g.title ?? ''}|${g.citation ?? ''}`).digest('hex');
    const key = `legacy-orphan:${hash}`;
    try {
      if (existing.get(key)?.ingestionStatus === 'completed') {
        totals.skipped++;
        return;
      }
      const chunkRows = await sql`
        SELECT title, content, embedding::text AS embedding, source_type, jurisdiction, citation, chunk_index
        FROM legal_library
        WHERE doc_id IS NULL AND title IS NOT DISTINCT FROM ${g.title} AND citation IS NOT DISTINCT FROM ${g.citation}
        ORDER BY chunk_index NULLS LAST, created_at, id`;
      const fields = {
        title: g.title || '(untitled)',
        sourceType: mapSourceType(g.source_type),
        jurisdiction: g.jurisdiction || 'ghana',
        citation: blankToUndef(g.citation),
        parties: [],
        originalFormat: 'htm-text',
        sourceCollection: 'supabase-legacy-orphans',
        extractedCharCount: g.chars ?? 0,
        ingestionStatus: 'completed',
        sourceKey: key,
      };
      await writeDoc(clients[worker], key, fields, chunkRows, undefined);
    } catch (err) {
      totals.failed++;
      log({ key, status: 'failed', error: String(err?.message ?? err) });
    }
  });
}

async function pool(items, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.max(1, CONCURRENCY) }, async (_, w) => {
    while (i < items.length) await worker(items[i++], w);
  });
  await Promise.all(runners);
}

const started = Date.now();
let processed = 0;
let lastId = '00000000-0000-0000-0000-000000000000';
const PAGE = 200;

console.log(`🚚 Migrating documents${DRY_RUN ? ' (dry run)' : ''}…`);
if (ONLY_ID) {
  // Retry a single document (e.g. one that failed on a transient network error).
  const docs = await sql`SELECT * FROM legal_library_documents WHERE id = ${ONLY_ID}::uuid`;
  await pool(docs, migrateDocument);
  processed = LIMIT; // skip the full scan and orphans
}
while (processed < LIMIT) {
  const docs = await sql`
    SELECT * FROM legal_library_documents WHERE id > ${lastId}::uuid ORDER BY id LIMIT ${Math.min(PAGE, LIMIT - processed)}`;
  if (docs.length === 0) break;
  await pool(docs, migrateDocument);
  processed += docs.length;
  lastId = docs[docs.length - 1].id;
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `   ${processed} docs · migrated ${totals.migrated} · skipped ${totals.skipped} · failed ${totals.failed} · ${totals.chunks} chunks · ${secs}s`,
  );
}

if (!SKIP_ORPHANS && processed < LIMIT) await migrateOrphans(LIMIT - processed);

console.log('\n✅ Done', JSON.stringify(totals));
if (logStream) console.log(`   Log: ${path.relative(process.cwd(), logPath)}`);
logStream?.end();
await sql.end();
process.exit(totals.failed > 0 ? 1 : 0);
