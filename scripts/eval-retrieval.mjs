/**
 * Retrieval-quality evaluation harness — measures the legal_library
 * retrieval pipeline in isolation from generation (per the "recall@k
 * isolates retrieval from generation" methodology), so pipeline changes
 * (hybrid search, reranking) can be proven with a number instead of eyeballed.
 *
 * Runs each question in scripts/eval/golden-questions.json against:
 *   - vector search alone (match_legal_library)
 *   - FTS alone (search_legal_library_fts)
 *   - hybrid: vector + FTS fused with Reciprocal Rank Fusion
 *   - hybrid + rerank: the fused candidates re-scored by a cross-encoder
 * and reports recall@5 / recall@10 for each, so you can see exactly how
 * much each stage contributes.
 *
 * A question "hits" if any of the top-k results' title or content contains
 * the question's expected_title_substring / expected_content_substring
 * (case-insensitive) — this is fuzzier than matching an exact doc_id
 * because the golden set was hand-built without database-side IDs.
 *
 * Usage: node scripts/eval-retrieval.mjs [--k=5,10] [--stage=vector,fts,hybrid,hybrid_rerank]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HF_KEY = process.env.HUGGINGFACE_API_KEY;
const RERANK_MODEL = 'cross-encoder/ms-marco-MiniLM-L-6-v2';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!HF_KEY) {
  console.warn('HUGGINGFACE_API_KEY not set — vector search and reranking stages will be skipped (FTS-only run).');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);
const kValues = (args.k ?? '5,10').split(',').map(Number);
const stages = (args.stage ?? 'vector,fts,hybrid,hybrid_rerank').split(',');
const CANDIDATE_POOL = 20; // "retrieve wide" per source before fusing/reranking

async function getEmbedding(text) {
  if (!HF_KEY) return null;
  try {
    const res = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data[0]) ? data[0] : data;
  } catch {
    return null;
  }
}

async function vectorSearch(embedding, matchCount) {
  if (!embedding) return [];
  const { data } = await supabase.rpc('match_legal_library', {
    query_embedding: embedding,
    match_count: matchCount,
    filter_jurisdiction: null,
    filter_source_type: null,
  });
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, content: r.content }));
}

async function ftsSearch(query, matchCount) {
  const { data } = await supabase.rpc('search_legal_library_fts', {
    search_query: query,
    match_count: matchCount,
  });
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, content: r.content }));
}

// Mirrors _shared/rrf.ts's reciprocalRankFusion — kept as a plain inline
// implementation here since eval scripts run under plain Node (.mjs) and
// the edge functions run under Deno; see that file for the canonical
// production version. Same formula: score = sum of 1/(k + rank) per list.
function reciprocalRankFusion(resultLists, k = 60) {
  const scores = new Map();
  const items = new Map();
  for (const list of resultLists) {
    list.forEach((item, rank) => {
      const prev = scores.get(item.id) ?? 0;
      scores.set(item.id, prev + 1 / (k + rank + 1));
      items.set(item.id, item);
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => items.get(id));
}

async function rerank(query, candidates) {
  if (!HF_KEY || candidates.length === 0) return candidates;
  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${RERANK_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: { source_sentence: query, sentences: candidates.map((c) => c.content.slice(0, 512)) },
        options: { wait_for_model: true },
      }),
    });
    if (!res.ok) return candidates;
    const scores = await res.json();
    if (!Array.isArray(scores) || scores.length !== candidates.length) return candidates;
    return candidates
      .map((c, i) => ({ ...c, _rerankScore: scores[i] }))
      .sort((a, b) => b._rerankScore - a._rerankScore);
  } catch {
    return candidates;
  }
}

function hits(results, k, question) {
  const top = results.slice(0, k);
  return top.some((r) => {
    const title = (r.title ?? '').toLowerCase();
    const content = (r.content ?? '').toLowerCase();
    const titleMatch = question.expected_title_substring
      ? title.includes(question.expected_title_substring.toLowerCase())
      : true;
    const contentMatch = question.expected_content_substring
      ? content.includes(question.expected_content_substring.toLowerCase())
      : true;
    return titleMatch && contentMatch;
  });
}

async function runStage(stage, question, embedding) {
  const maxK = Math.max(...kValues);
  if (stage === 'vector') {
    return vectorSearch(embedding, maxK);
  }
  if (stage === 'fts') {
    return ftsSearch(question.query, maxK);
  }
  if (stage === 'hybrid' || stage === 'hybrid_rerank') {
    const [vec, fts] = await Promise.all([
      vectorSearch(embedding, CANDIDATE_POOL),
      ftsSearch(question.query, CANDIDATE_POOL),
    ]);
    const fused = reciprocalRankFusion([vec, fts]);
    if (stage === 'hybrid') return fused.slice(0, maxK);
    const reranked = await rerank(question.query, fused.slice(0, CANDIDATE_POOL));
    return reranked.slice(0, maxK);
  }
  throw new Error(`Unknown stage: ${stage}`);
}

async function checkHfReachable() {
  if (!HF_KEY) return false;
  try {
    await getEmbedding('reachability check');
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const questions = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'eval/golden-questions.json'), 'utf8')
  );

  if (stages.some((s) => s !== 'fts')) {
    const probe = await getEmbedding('reachability check');
    if (!probe) {
      console.warn(
        '\n⚠️  Could not reach api-inference.huggingface.co from this machine (DNS/network block).\n' +
        '    vector/hybrid/hybrid_rerank stages will show artificially low recall — this is a local\n' +
        '    connectivity issue, not a retrieval-pipeline defect. Run this from an environment with\n' +
        '    HF access for real numbers, or rely on the "fts" stage here plus a live spot-check\n' +
        '    against the deployed legal-search edge function for the vector/hybrid path.\n'
      );
    }
  }

  console.log(`Running ${questions.length} questions x ${stages.length} stage(s), k=${kValues.join(',')}\n`);

  const results = {};
  for (const stage of stages) results[stage] = Object.fromEntries(kValues.map((k) => [k, 0]));

  const perQuestionLog = [];

  for (const q of questions) {
    const embedding = stages.some((s) => s !== 'fts') ? await getEmbedding(q.query) : null;
    const row = { id: q.id, query: q.query };
    for (const stage of stages) {
      const res = await runStage(stage, q, embedding);
      for (const k of kValues) {
        const hit = hits(res, k, q);
        if (hit) results[stage][k]++;
        row[`${stage}@${k}`] = hit ? 'HIT' : 'miss';
      }
    }
    perQuestionLog.push(row);
  }

  console.log('Per-question results:');
  console.table(perQuestionLog);

  console.log('\nRecall summary:');
  for (const stage of stages) {
    for (const k of kValues) {
      const recall = ((results[stage][k] / questions.length) * 100).toFixed(1);
      console.log(`  ${stage.padEnd(14)} recall@${k}: ${recall}% (${results[stage][k]}/${questions.length})`);
    }
  }
}

main();
