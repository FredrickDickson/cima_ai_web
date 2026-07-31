/**
 * Ingests legal documents from Supabase storage bucket into the legal_library table.
 * Reads files from the legal-documents bucket, extracts text, chunks content,
 * generates embeddings, and inserts into legal_library for AI access.
 *
 * Usage: node scripts/ingest-legal-documents.mjs [--user-id USER_ID] [--status STATUS]
 * Options:
 *   --user-id: Process only documents for a specific user
 *   --status: Process only documents with specific status (pending, failed)
 */

import { createClient } from '@supabase/supabase-js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripWatermarks } from './lib/sanitize-legal-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Point to the local worker file — required by pdfjs-dist 4.x in Node.js
GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).href;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HF_KEY = process.env.HUGGINGFACE_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!HF_KEY) {
  console.warn('⚠️  HUGGINGFACE_API_KEY not set — rows will be inserted WITHOUT embeddings (FTS fallback only)');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const userIdArg = args.find(a => a.startsWith('--user-id='))?.split('=')[1];
const statusArg = args.find(a => a.startsWith('--status='))?.split('=')[1];

// ─── TEXT EXTRACTION ────────────────────────────────────────────────────

async function extractTextFromPdf(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;

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

async function extractTextFromDocx(arrayBuffer) {
  const result = await mammoth.extractRawText({ buffer: arrayBuffer });
  return result.value;
}

async function extractText(file, mimeType) {
  if (mimeType === 'application/pdf') {
    return await extractTextFromPdf(file);
  } else if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
    return await extractTextFromDocx(file);
  } else if (mimeType === 'text/plain') {
    return new TextDecoder().decode(file);
  }
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

// ─── CHUNKING ────────────────────────────────────────────────────────────────

function chunkByArticle(fullText, titlePrefix) {
  const articleRegex = /(?=\b(?:Article|Rule|Section|Chapter|Part)\s+\d+[\.\s])/gi;
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

  if (chunks.length < 3) {
    return charChunk(fullText, titlePrefix);
  }

  return chunks;
}

function charChunk(text, titlePrefix, size = 1000, overlap = 150) {
  const chunks = [];
  let start = 0;
  let idx = 1;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let slice = text.slice(start, end);

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
        title: `${titlePrefix} — Part ${idx}`,
        citation: titlePrefix,
        content,
      });
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
  console.log('📚 Legal Document Ingestion from Storage Bucket\n');

  // Fetch pending ingestion records
  let query = supabase
    .from('legal_document_ingestion')
    .select('*')
    .in('status', ['pending', 'failed']);

  if (userIdArg) {
    query = query.eq('user_id', userIdArg);
  }
  if (statusArg) {
    query = query.eq('status', statusArg);
  }

  const { data: ingestions, error: fetchError } = await query;

  if (fetchError) {
    console.error('❌  Failed to fetch ingestion records:', fetchError.message);
    process.exit(1);
  }

  if (!ingestions || ingestions.length === 0) {
    console.log('✅  No documents to process');
    return;
  }

  console.log(`📋 Found ${ingestions.length} document(s) to process\n`);

  for (const ingestion of ingestions) {
    console.log(`\n📄 Processing: ${ingestion.storage_path}`);
    
    // Update status to processing
    await supabase
      .from('legal_document_ingestion')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', ingestion.id);

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('legal-documents')
        .download(ingestion.storage_path);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Get file metadata
      const { data: metadata } = await supabase
        .storage
        .from('legal-documents')
        .getMetadata(ingestion.storage_path);

      const mimeType = metadata?.mimeType || 'application/pdf';
      const fileName = ingestion.storage_path.split('/').pop();

      // Extract text
      console.log('   Extracting text...');
      const fullText = stripWatermarks(await extractText(fileData, mimeType));
      console.log(`   Extracted ${fullText.length.toLocaleString()} characters`);

      // Chunk content
      console.log('   Chunking content...');
      const titlePrefix = fileName.replace(/\.[^/.]+$/, '');
      const chunks = chunkByArticle(fullText, titlePrefix);
      console.log(`   Created ${chunks.length} chunks`);

      // Remove existing chunks for this document
      await supabase
        .from('legal_library')
        .delete()
        .ilike('title', `${titlePrefix}%`);

      // Embed + insert in batches
      const BATCH = 10;
      let inserted = 0;

      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const batchNum = Math.floor(i / BATCH) + 1;
        const totalBatches = Math.ceil(chunks.length / BATCH);
        process.stdout.write(`   Batch ${batchNum}/${totalBatches} — embedding...`);

        const embeddings = await getEmbeddings(batch.map(c => c.content));

        const rows = batch.map((chunk, j) => ({
          title: chunk.title,
          content: chunk.content,
          embedding: embeddings[j] ?? null,
          source_type: ingestion.source_type,
          jurisdiction: ingestion.jurisdiction,
          citation: chunk.citation,
        }));

        const { error: insErr } = await supabase.from('legal_library').insert(rows);
        if (insErr) {
          console.error(`\n   ❌ Insert error on batch ${batchNum}:`, insErr.message);
          throw insErr;
        } else {
          inserted += rows.length;
          process.stdout.write(` inserted ${rows.length} rows\n`);
        }

        if (i + BATCH < chunks.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Update ingestion record as completed
      await supabase
        .from('legal_document_ingestion')
        .update({
          status: 'completed',
          chunks_created: inserted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ingestion.id);

      console.log(`✅  Completed: ${inserted} chunks inserted into legal_library`);

    } catch (err) {
      console.error(`❌  Failed: ${err.message}`);
      
      // Update ingestion record as failed
      await supabase
        .from('legal_document_ingestion')
        .update({
          status: 'failed',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ingestion.id);
    }
  }

  console.log('\n✅  Ingestion complete!');
}

main().catch(err => {
  console.error('❌  Fatal:', err);
  process.exit(1);
});
