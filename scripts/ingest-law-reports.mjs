/**
 * Bulk-ingests the local `assests/Law Reports/` archive (Ghana case law +
 * constitutional instruments) into the Legal Library (`legal_library_documents`
 * + `legal_library`), embedding locally (no HuggingFace API / rate limits).
 *
 * Usage:
 *   node scripts/ingest-law-reports.mjs --dry-run
 *   node scripts/ingest-law-reports.mjs --dry-run --only="Supreme Court Cases/1978"
 *   node scripts/ingest-law-reports.mjs --limit=50 --only="COURT OF APPEAL/1975"
 *   node scripts/ingest-law-reports.mjs                       # full run
 *
 * Flags:
 *   --dry-run              Walk/parse/dedup only — no uploads, no DB writes
 *   --limit=N               Process at most N files this run
 *   --only=<substring>      Only consider files whose relative path includes this substring
 *   --batch-size=N          Embedding batch size (default 16)
 *   --batch-delay-ms=N      Delay between embedding batches (default 0 — local model, no rate limit)
 *   --force                 Reprocess files even if already marked completed
 *   --jurisdiction=<value>  Jurisdiction to tag all ingested rows with (default 'ghana') —
 *                           use the same lowercase country-name vocabulary as
 *                           supabase/functions/_shared/laws-africa.ts's COUNTRY_MAP
 *                           (e.g. 'kenya', 'nigeria') or 'international'
 *   --root=<path>           Archive root to walk, relative to this script's directory
 *                           (default '../assests/Law Reports'). Use this to point at a
 *                           differently-shaped archive, e.g. --root="../assests/International"
 *                           for a flat folder of instruments with no court/legislation
 *                           subfolder structure — see the `segments.length === 1` branch
 *                           in buildCandidate().
 */

import { createClient } from '@supabase/supabase-js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { convert as htmlToText } from 'html-to-text';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { stripWatermarks } from './lib/sanitize-legal-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).href;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const BUCKET = 'legal-documents';

// ─── CLI ARGS ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const ROOT_ARG = argv.find(a => a.startsWith('--root='))?.split('=')[1] ?? '../assests/Law Reports';
const ROOT_DIR = path.resolve(__dirname, ROOT_ARG);
const DRY_RUN = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const LIMIT = Number(argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0) || Infinity;
const ONLY = argv.find(a => a.startsWith('--only='))?.split('=')[1] ?? null;
const BATCH_SIZE = Number(argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] ?? 8);
const BATCH_DELAY_MS = Number(argv.find(a => a.startsWith('--batch-delay-ms='))?.split('=')[1] ?? 0);
const DOC_DELAY_MS = Number(argv.find(a => a.startsWith('--doc-delay-ms='))?.split('=')[1] ?? 400);
const JURISDICTION = argv.find(a => a.startsWith('--jurisdiction='))?.split('=')[1] ?? 'ghana';

// ─── LOGGING ───────────────────────────────────────────────────────────────

const logsDir = path.resolve(__dirname, 'logs');
if (!DRY_RUN && !fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(logsDir, `law-reports-ingest-${runStamp}.jsonl`);
const logStream = DRY_RUN ? null : fs.createWriteStream(logPath, { flags: 'a' });

function logLine(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  if (logStream) logStream.write(line + '\n');
}

// ─── WALK & JUNK FILTERING ───────────────────────────────────────────────

const SKIP_DIR_NAMES = new Set(['images', 'inter face', 'CASES', 'TABLE OF CASES']);
const SKIP_EXTS = new Set(['.gif', '.jpg', '.jpeg', '.png', '.exe', '.db', '.ini', '.plt']);
const SKIP_BASENAME_RE = /^(temp\.htm|table of cases.*|thumbs\.db|playlist\.plt)$/i;

function shouldSkipDir(dirName) {
  if (SKIP_DIR_NAMES.has(dirName)) return true;
  if (/_files$/i.test(dirName)) return true; // saved-webpage asset clutter
  return false;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function sniffFormat(absPath) {
  try {
    const fd = fs.openSync(absPath, 'r');
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    if (buf[0] === 0x50 && buf[1] === 0x4b) return 'docx'; // PK.. zip (docx/xlsx)
    if (buf.toString('ascii', 0, 4) === '%PDF') return 'pdf';
    return 'htm'; // fall back: most truncated-name files are saved-webpage fragments
  } catch {
    return null;
  }
}

function classifyFile(absPath) {
  const base = path.basename(absPath);
  const ext = path.extname(absPath).toLowerCase();

  if (base === 'Thumbs.db' || SKIP_BASENAME_RE.test(base)) return null;
  if (SKIP_EXTS.has(ext)) return null;

  let stat;
  try {
    stat = fs.statSync(absPath);
  } catch {
    return null;
  }
  if (stat.size === 0) return null;

  if (ext === '.docx' || ext === '.doc') return 'docx';
  if (ext === '.pdf') return 'pdf';
  if (ext === '.htm' || ext === '.html') return 'htm';
  if (ext === '') return sniffFormat(absPath); // truncated/missing extension
  return null; // unrecognized extension (.rtf, .xml, .jpeg variants, etc.) — skip
}

// ─── METADATA PARSING ────────────────────────────────────────────────────

const FORMAT_PRIORITY = { docx: 3, pdf: 2, htm: 1 };

function normalizeKey(filenameNoExt) {
  return filenameNoExt
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseCaseParties(filenameNoExt) {
  const cleaned = filenameNoExt
    .replace(/\[[^\]]*\]/g, '')  // complete [bracket] fragments
    .replace(/\[[^\]]*$/, '')    // truncated trailing [bracket (never closed)
    .trim();
  const splitRe = /\s+(?:vs\.?|v\.?|vrs\.?)\s+/i;
  const match = cleaned.match(splitRe);
  if (!match) return { title: cleaned.replace(/\s+/g, ' ').trim(), parties: [] };
  const idx = match.index;
  const plaintiff = cleaned.slice(0, idx).replace(/\s+/g, ' ').trim();
  const defendant = cleaned.slice(idx + match[0].length).replace(/\s+/g, ' ').trim();
  const title = `${plaintiff} v. ${defendant}`;
  const parties = [];
  if (plaintiff) parties.push({ role: 'plaintiff', name: plaintiff });
  if (defendant) parties.push({ role: 'defendant', name: defendant });
  return { title, parties };
}

function parseCitation(filename) {
  const m = filename.match(/\[(\d{4})\]\s*\d*\s*[A-Z]{2,6}\s*\d+(?:-\d+)?/);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
}

function parseLegislationNumber(filename) {
  const m = filename.match(/\(?\[?\s*c\.?\s*[i1]\.?\s*\.?\s*(\d+)\s*\)?\]?/i);
  return m ? `C.I. ${m[1]}` : '';
}

function parseYearFromText(text) {
  const m = text.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  return m ? Number(m[1]) : null;
}

function normalizeCourtDir(dirName) {
  const n = dirName.toLowerCase();
  if (n.includes('supreme')) return { court: 'Supreme Court', collection: n.includes(' a') ? 'supreme-court-a' : 'supreme-court-primary' };
  if (n.includes('court of appeal')) return { court: 'Court of Appeal', collection: dirName.trim().toLowerCase() === 'court of appeal cases a' ? 'court-of-appeal-a' : 'court-of-appeal-primary' };
  if (n.includes('high court')) return { court: 'High Court', collection: dirName.trim().toLowerCase() === 'high court a' ? 'high-court-a' : 'high-court-primary' };
  return null;
}

function slugify(str, maxLen = 60) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '') || 'untitled';
}

/** Build a candidate record with all metadata needed for dedup + ingestion. */
function buildCandidate(absPath) {
  const format = classifyFile(absPath);
  if (!format) return null;

  const relPath = path.relative(ROOT_DIR, absPath);
  const segments = relPath.split(path.sep);
  const filenameNoExt = path.basename(absPath, path.extname(absPath));

  let sourceType, court, year, sourceCollection, dedupKey, title, parties, citation, legislationNumber;

  if (segments[0]?.toLowerCase() === 'bons') {
    sourceType = 'statute';
    court = '';
    const legislationFolder = segments[2] ?? segments[1] ?? '';
    const isConstitution = legislationFolder.toLowerCase().includes('1992 constitution');
    sourceCollection = `legislation-${slugify(legislationFolder, 30)}`;
    year = isConstitution ? 1992 : parseYearFromText(filenameNoExt);
    legislationNumber = parseLegislationNumber(filenameNoExt);
    title = isConstitution
      ? `Constitution of the Republic of Ghana, 1992 — ${filenameNoExt.replace(/\s+/g, ' ').trim()}`
      : filenameNoExt.replace(/\s+/g, ' ').trim();
    parties = [];
    citation = '';
    // Deliberately folder-independent: dedups the 3 near-duplicate CI scan-pass
    // folders (C I WORK 4TH / C.I WORK 3 REP / WORK 2 REP CI) against each other.
    dedupKey = `statute|${normalizeKey(filenameNoExt)}`;
  } else if (segments[0]?.toLowerCase() === 'court appeal') {
    const courtDirName = segments[1] ?? '';
    const courtInfo = normalizeCourtDir(courtDirName);
    if (!courtInfo) return null; // e.g. stray files directly under "court appeal/"
    sourceType = 'case';
    court = courtInfo.court;
    sourceCollection = courtInfo.collection;
    year = null;
    for (const seg of segments.slice(2)) {
      const m = seg.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
      if (m) { year = Number(m[1]); break; }
    }
    legislationNumber = '';
    citation = parseCitation(filenameNoExt);
    const parsed = parseCaseParties(filenameNoExt);
    title = parsed.title;
    parties = parsed.parties;
    dedupKey = `case|${court}|${year ?? 'unknown'}|${normalizeKey(filenameNoExt)}`;
  } else if (segments.length === 1) {
    // A file sitting directly at ROOT_DIR with no category subfolder — used for
    // flat archives like assests/International (institutional rules/conventions,
    // no court/legislation folder structure to key off of).
    sourceType = 'statute';
    court = '';
    year = parseYearFromText(filenameNoExt);
    sourceCollection = slugify(filenameNoExt, 60);
    title = filenameNoExt.replace(/\s+/g, ' ').trim();
    parties = [];
    citation = '';
    legislationNumber = '';
    // Deliberately NOT normalizeKey() here — it strips parenthetical content, which
    // would silently collapse e.g. "... Rules 2025" and "... Rules 2025 (Draft - November)"
    // into the same dedup group and drop one without telling anyone. Exact filename instead.
    dedupKey = `flat|${filenameNoExt}`;
  } else {
    return null; // unexpected top-level folder
  }

  return {
    absPath,
    relPath,
    format,
    sourceType,
    court,
    year,
    sourceCollection,
    title,
    parties,
    citation,
    legislationNumber,
    dedupKey,
  };
}

/** Group candidates by dedupKey, keep the highest-format-priority one per group. */
function dedupCandidates(candidates) {
  const groups = new Map();
  for (const c of candidates) {
    const existing = groups.get(c.dedupKey);
    if (!existing) {
      groups.set(c.dedupKey, c);
    } else if (FORMAT_PRIORITY[c.format] > FORMAT_PRIORITY[existing.format]) {
      existing.supersededBy = null;
      c.supersedes = existing;
      groups.set(c.dedupKey, c);
    } else {
      c.supersededByPath = existing.absPath;
    }
  }
  const winners = [...groups.values()];
  const superseded = candidates.filter(c => !winners.includes(c));
  return { winners, superseded };
}

// ─── TEXT EXTRACTION ─────────────────────────────────────────────────────

async function extractPdfText(buffer) {
  const pdf = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(it => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();
    if (text) pages.push(text);
  }
  return pages.join('\n');
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractHtmlText(buffer) {
  const html = buffer.toString('utf8');
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { ignoreHref: true } },
    ],
  });
}

async function extractText(absPath, format) {
  const buffer = fs.readFileSync(absPath);
  if (format === 'docx') return await extractDocxText(buffer);
  if (format === 'pdf') return await extractPdfText(buffer);
  return extractHtmlText(buffer);
}

// ─── CHUNKING (ported from ingest-legal-document edge function) ──────────

function chunkByArticle(fullText, titlePrefix) {
  const articleRegex = /(?=\b(?:Article|Rule|Section|Chapter|Part)\s+\d+[.\s])/gi;
  const parts = fullText.split(articleRegex).filter(p => p.trim().length > 30);

  const chunks = [];
  for (const part of parts) {
    const headingMatch = part.match(/^((?:Article|Rule|Section|Chapter|Part)\s+\d+[.:—\s][^\n]*)/i);
    const heading = headingMatch ? headingMatch[1].replace(/\s+/g, ' ').trim() : null;
    const content = part.replace(/\s+/g, ' ').trim();
    if (content.length < 40) continue;

    const numMatch = (heading || content).match(/(?:Article|Rule|Section|Chapter|Part)\s+(\d+)/i);
    const num = numMatch ? numMatch[1] : null;

    chunks.push({
      title: heading ? `${titlePrefix} — ${heading}` : titlePrefix,
      citation: num ? `${titlePrefix}, ${num}` : titlePrefix,
      content,
    });
  }
  return chunks.length >= 3 ? chunks : charChunk(fullText, titlePrefix);
}

function charChunk(text, titlePrefix, size = 1000, overlap = 150) {
  const chunks = [];
  let start = 0;
  let idx = 1;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let slice = text.slice(start, end);
    if (end < text.length) {
      const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'), slice.lastIndexOf('\n\n'));
      if (lastStop > size * 0.5) slice = slice.slice(0, lastStop + 1);
    }
    const content = slice.trim();
    if (content.length > 40) {
      chunks.push({ title: `${titlePrefix} — Part ${idx}`, citation: titlePrefix, content });
      idx++;
    }
    // Once we've reached the end of the text, stop — otherwise `end` stays
    // pinned at text.length and `start = end - overlap` recomputes to the
    // same value forever (infinite loop).
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

// ─── LOCAL EMBEDDINGS ──────────────────────────────────────────────────────

let embedderPromise = null;
async function getEmbedder() {
  if (!embedderPromise) {
    const { pipeline } = await import('@huggingface/transformers');
    console.log('⏳ Loading local embedding model (Xenova/bge-small-en-v1.5) — first run downloads ~130MB...');
    embedderPromise = pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
  }
  return embedderPromise;
}

async function embedTexts(texts) {
  const embedder = await getEmbedder();
  const output = await embedder(texts, { pooling: 'mean', normalize: true });
  return output.tolist();
}

// ─── STORAGE PATH ────────────────────────────────────────────────────────

function shortHash(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 8);
}

function getFinalExt(candidate) {
  return candidate.format === 'htm' ? 'txt' : candidate.format;
}

function buildStoragePath(candidate, finalExt) {
  const courtOrLegislation = candidate.sourceType === 'case'
    ? slugify(candidate.court)
    : 'legislation';
  const yearSeg = candidate.year ?? 'unknown';
  const nameSlug = slugify(candidate.title, 60);
  const hash = shortHash(candidate.relPath);
  return `library/${candidate.sourceType}/${courtOrLegislation}/${yearSeg}/${nameSlug}-${hash}.${finalExt}`;
}

// ─── NETWORK RETRY HELPER ──────────────────────────────────────────────────
// Long runs (tens of thousands of sequential Supabase calls over many hours)
// can hit transient "fetch failed" connection errors. Supabase client calls
// resolve with { data, error } rather than throwing on network failure, so
// retry based on the returned error field (falling back to try/catch for any
// call that does throw), with backoff before giving up on a given file.

async function withRetry(fn, { attempts = 4, delayMs = 1200 } = {}) {
  let lastResult;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      if (!result?.error) return result;
      lastResult = result;
    } catch (err) {
      lastResult = { data: null, error: err };
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
  }
  return lastResult;
}

// ─── MAIN PIPELINE ────────────────────────────────────────────────────────

async function processCandidate(candidate) {
  const finalExt = getFinalExt(candidate);
  const storagePath = buildStoragePath(candidate, finalExt);

  try {
    const rawText = await extractText(candidate.absPath, candidate.format);
    const text = stripWatermarks(rawText);
    if (!text || text.trim().length < 50) {
      throw new Error('Extracted text too short (<50 chars) — likely empty or image-only');
    }

    // Upload artifact (extracted text for htm sources, original bytes otherwise)
    const uploadBuffer = candidate.format === 'htm'
      ? Buffer.from(text, 'utf8')
      : fs.readFileSync(candidate.absPath);
    const contentType = finalExt === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : finalExt === 'pdf'
        ? 'application/pdf'
        : 'text/plain';

    const { error: uploadError } = await withRetry(() => supabase.storage
      .from(BUCKET)
      .upload(storagePath, uploadBuffer, { upsert: true, contentType }));
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Upsert parent document row
    const { data: docRow, error: docError } = await withRetry(() => supabase
      .from('legal_library_documents')
      .upsert({
        title: candidate.title,
        source_type: candidate.sourceType,
        jurisdiction: JURISDICTION,
        citation: candidate.citation,
        court: candidate.court,
        decided_year: candidate.year,
        parties: candidate.parties,
        legislation_number: candidate.legislationNumber,
        storage_path: storagePath,
        original_format: candidate.format === 'htm' ? 'htm-text' : candidate.format,
        source_collection: candidate.sourceCollection,
        extracted_char_count: text.length,
        ingestion_status: 'processing',
        error_message: null,
      }, { onConflict: 'storage_path' })
      .select('id')
      .single());
    if (docError) throw new Error(`Document upsert failed: ${docError.message}`);
    const docId = docRow.id;

    // Clear any prior chunks (reprocess-safe)
    await withRetry(() => supabase.from('legal_library').delete().eq('doc_id', docId));

    // Chunk + embed + insert
    const chunks = chunkByArticle(text, candidate.title);
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedTexts(batch.map(c => c.content));
      const rows = batch.map((chunk, j) => ({
        title: chunk.title,
        content: chunk.content,
        embedding: embeddings[j] ?? null,
        source_type: candidate.sourceType,
        jurisdiction: JURISDICTION,
        citation: chunk.citation,
        doc_id: docId,
        chunk_index: i + j,
      }));
      const { error: insErr } = await withRetry(() => supabase.from('legal_library').insert(rows));
      if (insErr) {
        // Batch insert kept failing (e.g. statement timeout under write load
        // on the HNSW index) — fall back to one-row-at-a-time, which is much
        // less likely to time out, before giving up on the whole document.
        for (const row of rows) {
          const { error: rowErr } = await withRetry(() => supabase.from('legal_library').insert([row]), { attempts: 5, delayMs: 1500 });
          if (rowErr) throw new Error(`Chunk insert failed: ${rowErr.message}`);
          inserted++;
        }
      } else {
        inserted += rows.length;
      }
      if (BATCH_DELAY_MS > 0 && i + BATCH_SIZE < chunks.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    await withRetry(() => supabase
      .from('legal_library_documents')
      .update({ ingestion_status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', docId));

    logLine({ relPath: candidate.relPath, storagePath, docId, chunks: inserted, status: 'completed' });
    return 'completed';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logLine({ relPath: candidate.relPath, storagePath, status: 'failed', error: message });
    await withRetry(() => supabase
      .from('legal_library_documents')
      .upsert({
        storage_path: storagePath,
        title: candidate.title,
        source_type: candidate.sourceType,
        jurisdiction: JURISDICTION,
        court: candidate.court,
        decided_year: candidate.year,
        ingestion_status: 'failed',
        error_message: message,
      }, { onConflict: 'storage_path' }));
    return 'failed';
  }
}

async function main() {
  console.log('📚  Law Reports Bulk Ingestion');
  console.log(`    Root: ${ROOT_DIR}`);
  console.log(`    Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}${FORCE ? ' [force reprocess]' : ''}`);
  if (ONLY) console.log(`    Filter: only paths containing "${ONLY}"`);
  console.log('');

  if (!fs.existsSync(ROOT_DIR)) {
    console.error(`❌  Folder not found: ${ROOT_DIR}`);
    process.exit(1);
  }

  console.log('🔍  Walking folder tree...');
  const allFiles = walk(ROOT_DIR);
  console.log(`    Found ${allFiles.length} files (pre-filter)`);

  let candidates = allFiles
    .map(buildCandidate)
    .filter(Boolean);
  console.log(`    ${candidates.length} candidate legal documents after junk filtering`);

  if (ONLY) {
    const onlyNorm = ONLY.replace(/\//g, path.sep);
    candidates = candidates.filter(c => c.relPath.includes(onlyNorm));
    console.log(`    ${candidates.length} candidates after --only filter`);
  }

  const { winners, superseded } = dedupCandidates(candidates);
  console.log(`    ${winners.length} unique documents after dedup (${superseded.length} superseded duplicates)`);

  const bySourceType = winners.reduce((acc, c) => {
    acc[c.sourceType] = (acc[c.sourceType] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`    By type: ${JSON.stringify(bySourceType)}`);

  if (DRY_RUN) {
    console.log('\n--- Dedup decisions (superseded → kept) sample (first 20) ---');
    for (const s of superseded.slice(0, 20)) {
      console.log(`  SKIP  ${s.relPath}  (superseded by a higher-priority format)`);
    }
    console.log('\n--- Sample parsed candidates (first 20) ---');
    for (const c of winners.slice(0, 20)) {
      console.log(`  [${c.sourceType}] ${c.court || c.legislationNumber || ''} ${c.year ?? ''} — "${c.title}" (${c.format})`);
    }
    console.log('\n✅  Dry run complete — no writes performed.');
    return;
  }

  // Filter out already-completed candidates BEFORE applying --limit, so a
  // chunked series of runs (each with --limit) targets outstanding
  // failed/pending work instead of re-scanning the same already-done prefix.
  const stats = { completed: 0, failed: 0, skipped: 0 };
  let pending = winners;
  if (!FORCE) {
    console.log('🔎  Checking already-completed documents...');
    const completedPaths = new Set();
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await withRetry(() => supabase
        .from('legal_library_documents')
        .select('storage_path')
        .eq('ingestion_status', 'completed')
        .range(offset, offset + pageSize - 1), { attempts: 12, delayMs: 2000 });
      if (error) {
        console.error(`\n❌  Could not fetch already-completed documents (page offset=${offset}): ${error.message}`);
        console.error('    Refusing to proceed — this would cause every document to be reprocessed from scratch.');
        console.error('    Re-run the script once the database is responsive again.');
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      for (const row of data) completedPaths.add(row.storage_path);
      if (data.length < pageSize) break;
    }
    console.log(`    ${completedPaths.size} already completed`);
    pending = winners.filter(c => !completedPaths.has(buildStoragePath(c, getFinalExt(c))));
    stats.skipped = winners.length - pending.length;
  }

  const toProcess = pending.slice(0, LIMIT);
  console.log(`\n🚀  Processing ${toProcess.length} documents (${pending.length} outstanding, ${stats.skipped} already completed)...\n`);

  let i = 0;
  for (const candidate of toProcess) {
    i++;
    process.stdout.write(`[${i}/${toProcess.length}] ${candidate.relPath.slice(0, 80)}... `);
    const status = await processCandidate(candidate);
    stats[status]++;
    // Small pacing delay between documents — under sustained write load the
    // Supabase project can return transient "schema cache" / timeout errors;
    // giving it breathing room between documents reduces how often that happens.
    if (DOC_DELAY_MS > 0) await new Promise(r => setTimeout(r, DOC_DELAY_MS));
    console.log(status);
  }

  console.log(`\n✅  Done — completed: ${stats.completed}, failed: ${stats.failed}, skipped: ${stats.skipped}`);
  console.log(`    Log: ${logPath}`);
}

main().catch(err => {
  console.error('❌  Fatal:', err);
  process.exit(1);
});
