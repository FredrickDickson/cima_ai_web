/**
 * Folds conversation history into a standalone search query before
 * retrieval. Without this, a follow-up like "what about interim measures?"
 * is searched on that sentence alone — extractLegalQuery() (laws-africa.ts)
 * only ever looks at the last message, so the antecedent topic from earlier
 * turns is silently dropped and retrieval searches on a fragment.
 *
 * Only fires when there's actually prior context to fold in (single-shot
 * callers like legal-search don't need this). Uses a small, cheap,
 * low-token DeepSeek call — this is a pipeline step, not a chat turn, so it
 * should be fast and near-free relative to the main generation call. Fails
 * soft: any error returns null so the caller falls back to its own
 * extraction instead of blocking retrieval on this call.
 */

interface Message {
  role: string;
  content: string;
}

export async function rewriteQueryForRetrieval(
  messages: Message[],
  deepseekKey: string,
): Promise<string | null> {
  if (messages.length < 2) return null;

  // Last few turns only — enough context to resolve pronouns/antecedents
  // without inflating the prompt or the latency of this pre-retrieval step.
  const recent = messages.slice(-6);
  const transcript = recent.map((m) => `${m.role}: ${m.content}`).join("\n");

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Rewrite the final user message into a single standalone legal search query, " +
              "folding in whatever context from earlier turns is needed to make it self-contained " +
              "(e.g. resolve \"that\", \"it\", \"the same case\" to what they refer to). " +
              "Reply with ONLY the rewritten query text — no quotes, no explanation, no prefix.",
          },
          { role: "user", content: transcript },
        ],
        temperature: 0,
        max_tokens: 80,
      }),
    });
    if (!res.ok) {
      console.error(`rewriteQueryForRetrieval: DeepSeek request failed (${res.status})`);
      return null;
    }
    const data = await res.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    return rewritten && rewritten.length > 0 ? rewritten : null;
  } catch (err) {
    console.error("rewriteQueryForRetrieval: request threw", err);
    return null;
  }
}
