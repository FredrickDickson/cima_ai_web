/**
 * Splits text into overlapping chunks, preferring to break at a sentence or
 * paragraph boundary near the target size instead of a hard character cut.
 * A hard cut can split a chunk mid-word/mid-sentence, which degrades
 * full-text-search ranking (partial words at chunk edges don't match search
 * index tokens cleanly). Ported verbatim from
 * supabase/functions/_shared/text-chunking.ts (pure TS, no Deno-specific
 * APIs) so the large-document pipeline chunks at the same quality as the
 * rest of the app instead of introducing a third chunking implementation.
 */
export function chunkBySentenceBoundary(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let slice = text.slice(start, end);

    if (end < text.length) {
      const lastStop = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf(".\n"),
        slice.lastIndexOf("\n\n"),
      );
      if (lastStop > size * 0.5) slice = slice.slice(0, lastStop + 1);
    }

    const content = slice.trim();
    if (content.length > 0) chunks.push(content);

    // Once we've reached the end of the text, stop — otherwise `end` stays
    // pinned at text.length and `start = end - overlap` recomputes to the
    // same value forever (infinite loop).
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}
