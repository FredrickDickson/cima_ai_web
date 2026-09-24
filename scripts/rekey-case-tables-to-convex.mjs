/**
 * After supabase/migrations/20260924000000_move_legal_library_to_convex.sql,
 * rewrites the case-tool tables' library-doc columns from pre-migration
 * Supabase UUIDs to the matching Convex ids (via libraryDocuments.legacyId),
 * so the viewer, case-brief and case-citator all see one kind of id.
 *
 * citing_chunk_id values are nulled: old legal_library chunk ids have no
 * Convex equivalent (the column is informational, already nullable).
 *
 *   node scripts/rekey-case-tables-to-convex.mjs [--dry-run]
 *
 * Env: SUPABASE_DB_URL, VITE_CONVEX_URL.
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

const DRY_RUN = process.argv.includes('--dry-run');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require', prepare: false, max: 1 });
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

const cache = new Map();
async function toConvexId(legacyId) {
  if (!legacyId || !UUID_RE.test(legacyId)) return legacyId; // already a Convex id
  if (!cache.has(legacyId)) {
    const doc = await convex.query(api.libraryDocuments.getByLegacyId, { legacyId });
    cache.set(legacyId, doc?._id ?? null);
  }
  const id = cache.get(legacyId);
  if (!id) throw new Error(`No Convex doc for legacy id ${legacyId}`);
  return id;
}

const COLUMNS = [
  ['case_briefs', 'doc_id'],
  ['case_citator_runs', 'cited_doc_id'],
  ['case_citations', 'cited_doc_id'],
  ['case_citations', 'citing_doc_id'],
];

for (const [table, column] of COLUMNS) {
  const rows = await sql`SELECT DISTINCT ${sql(column)} AS v FROM ${sql(table)} WHERE ${sql(column)} ~* ${UUID_RE.source}`;
  for (const { v } of rows) {
    const next = await toConvexId(v);
    console.log(`${table}.${column}: ${v} → ${next}`);
    if (!DRY_RUN) await sql`UPDATE ${sql(table)} SET ${sql(column)} = ${next} WHERE ${sql(column)} = ${v}`;
  }
}

const [{ n }] = await sql`SELECT count(*)::int AS n FROM case_citations WHERE citing_chunk_id ~* ${UUID_RE.source}`;
console.log(`case_citations.citing_chunk_id: ${n} legacy chunk ids → NULL`);
if (!DRY_RUN) await sql`UPDATE case_citations SET citing_chunk_id = NULL WHERE citing_chunk_id ~* ${UUID_RE.source}`;

console.log(DRY_RUN ? '\n(dry run — nothing written)' : '\n✅ Done');
await sql.end();
