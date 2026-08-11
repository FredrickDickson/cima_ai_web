/**
 * Cross-encoder reranking via HuggingFace's hosted Inference API — reuses
 * the existing HUGGINGFACE_API_KEY (no new vendor). A cross-encoder scores
 * (query, candidate) pairs together rather than comparing precomputed
 * embeddings separately, which is far more accurate than first-stage vector/
 * FTS ranking but too slow to run over an entire corpus — so it's used here
 * only to re-sort the already-narrowed candidate set from RRF fusion.
 *
 * Fails soft: any error (rate limit, model cold-start timeout, network)
 * returns the input order unchanged rather than breaking the request, same
 * fail-soft philosophy as getEmbedding() in legal-retrieval.ts.
 */

const RERANK_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2";

export async function rerank<T extends { content: string }>(
  query: string,
  candidates: T[],
  hfKey: string,
): Promise<T[]> {
  if (!hfKey || candidates.length === 0) return candidates;

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${RERANK_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: {
          source_sentence: query,
          sentences: candidates.map((c) => c.content.slice(0, 512)),
        },
        options: { wait_for_model: true },
      }),
    });
    if (!res.ok) {
      console.error(`rerank: HuggingFace request failed (${res.status})`);
      return candidates;
    }
    const scores = await res.json();
    if (!Array.isArray(scores) || scores.length !== candidates.length) return candidates;

    return candidates
      .map((c, i) => ({ item: c, score: scores[i] as number }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  } catch (err) {
    console.error("rerank: request threw", err);
    return candidates;
  }
}
