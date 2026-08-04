/**
 * Ingests the Accra Arbitration Rules 2025 PDF into the legal_library table.
 * Each article is stored as a separate row with a 384-dim BAAI embedding so
 * that legal-search, generate-draft, and ai-chat can retrieve relevant rules.
 *
 * Usage: node scripts/ingest-cima-rules.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import dotenv from 'dotenv';
import { stripWatermarks } from './lib/sanitize-legal-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Point to the local worker file — required by pdfjs-dist 4.x in Node.js
GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).href;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HF_KEY       = process.env.HUGGINGFACE_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!HF_KEY) {
  console.warn('⚠️  HUGGINGFACE_API_KEY not set — rows will be inserted WITHOUT embeddings (FTS fallback only)');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const PDF_PATH = path.resolve(__dirname, '../assests/ACCRA ARB RULES 2025.pdf');
const SOURCE_TITLE_PREFIX = 'Accra Arbitration Rules 2025';
const CITATION_PREFIX     = 'Accra Arbitration Rules 2025';
const JURISDICTION        = 'ghana';
const SOURCE_TYPE         = 'rule';

// ─── PDF TEXT EXTRACTION ────────────────────────────────────────────────────

async function extractPdfText(filePath) {
  console.log('📄 Extracting text from PDF…');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  console.log(`   ${pdf.numPages} pages found`);

  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pageTexts.push(pageText);
  }
  return pageTexts.join('\n');
}

// ─── CHUNKING ────────────────────────────────────────────────────────────────

/**
 * Split text on Article / Rule / Section headings.
 * Each chunk gets a heading-derived title and citation.
 */
function chunkByArticle(fullText) {
  // Match "Article 1", "Article 1.", "Rule 1", "Section 1" at start of a word boundary
  const articleRegex = /(?=\b(?:Article|Rule|Section)\s+\d+[\.\s])/gi;
  const parts = fullText.split(articleRegex).filter(p => p.trim().length > 30);

  const chunks = [];
  for (const part of parts) {
    const headingMatch = part.match(/^((?:Article|Rule|Section)\s+\d+[.:—\s][^\n]*)/i);
    const heading = headingMatch ? headingMatch[1].replace(/\s+/g, ' ').trim() : null;
    const content = part.replace(/\s+/g, ' ').trim();

    if (content.length < 40) continue;

    // Extract article number for citation
    const numMatch = (heading || content).match(/(?:Article|Rule|Section)\s+(\d+)/i);
    const artNum = numMatch ? numMatch[1] : null;

    chunks.push({
      title: heading
        ? `${SOURCE_TITLE_PREFIX} — ${heading}`
        : SOURCE_TITLE_PREFIX,
      citation: artNum
        ? `${CITATION_PREFIX}, Art. ${artNum}`
        : CITATION_PREFIX,
      content,
    });
  }

  // If article splitting produced fewer than 3 chunks the PDF may not follow
  // a numbered article structure — fall back to character-based chunking.
  if (chunks.length < 3) {
    console.log('   Article split yielded too few chunks — falling back to character chunking');
    return charChunk(fullText);
  }

  return chunks;
}

function charChunk(text, size = 1000, overlap = 150) {
  const chunks = [];
  let start = 0;
  let idx = 1;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let slice = text.slice(start, end);

    // Prefer sentence boundaries
    if (end < text.length) {
      const lastStop = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n'),
        slice.lastIndexOf('\n\n'),
      );
      if (lastStop > size * 0.5) slice = slice.slice(0, lastStop + 1);
    }

    const content = slice.trim();
    if (content.length > 40) {
      chunks.push({
        title: `${SOURCE_TITLE_PREFIX} — Part ${idx}`,
        citation: `${CITATION_PREFIX}`,
        content,
      });
      idx++;
    }
    start = end - overlap;
  }
  return chunks;
}

// ─── EMBEDDINGS ──────────────────────────────────────────────────────────────

async function getEmbeddings(texts) {
  if (!HF_KEY) return texts.map(() => null);

  try {
    const res = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      }
    );

    if (!res.ok) {
      console.warn(`   Huggingface returned ${res.status} — skipping embeddings for this batch`);
      return texts.map(() => null);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : texts.map(() => null);
  } catch (err) {
    console.warn(`   Huggingface unreachable (${err.message}) — inserting without embeddings (FTS fallback)`);
    return texts.map(() => null);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌  PDF not found: ${PDF_PATH}`);
    process.exit(1);
  }

  // 1. Extract text
  const fullText = stripWatermarks(await extractPdfText(PDF_PATH));
  console.log(`   Extracted ${fullText.length.toLocaleString()} characters`);

  // 2. Chunk
  const chunks = chunkByArticle(fullText);
  console.log(`✂️  Created ${chunks.length} chunks`);

  // 3. Remove old Accra Rules rows to avoid duplicates
  console.log('🗑️  Removing existing Accra Arbitration Rules 2025 rows…');
  const { error: delErr } = await supabase
    .from('legal_library')
    .delete()
    .ilike('title', `${SOURCE_TITLE_PREFIX}%`);
  if (delErr) console.warn('   Delete warning:', delErr.message);

  // 4. Embed + insert in batches of 10
  const BATCH = 10;
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH);
    process.stdout.write(`🔢 Batch ${batchNum}/${totalBatches} — embedding…`);

    const embeddings = await getEmbeddings(batch.map(c => c.content));

    const rows = batch.map((chunk, j) => ({
      title:       chunk.title,
      content:     chunk.content,
      embedding:   embeddings[j] ?? null,
      source_type: SOURCE_TYPE,
      jurisdiction: JURISDICTION,
      citation:    chunk.citation,
    }));

    const { error: insErr } = await supabase.from('legal_library').insert(rows);
    if (insErr) {
      console.error(`\n❌  Insert error on batch ${batchNum}:`, insErr.message);
    } else {
      inserted += rows.length;
      process.stdout.write(` inserted ${rows.length} rows\n`);
    }

    // Small delay to avoid Huggingface rate limits
    if (i + BATCH < chunks.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n✅  Done! ${inserted}/${chunks.length} chunks inserted into legal_library.`);
  console.log('   The Accra Arbitration Rules 2025 are now available to:');
  console.log('   • Legal Research (semantic + full-text search)');
  console.log('   • AI Drafting (context injection via generate-draft)');
  console.log('   • AI Assistant (context injection via ai-chat)');
}

main().catch(err => {
  console.error('❌  Fatal:', err);
  process.exit(1);
});
