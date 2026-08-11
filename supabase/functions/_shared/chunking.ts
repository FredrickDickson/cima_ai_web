/**
 * Structure-aware chunking, extracted from ingest-legal-document/index.ts
 * (previously copy-pasted near-identically across that function and several
 * scripts/ingest-*.mjs files). Splits on legal-document headings
 * (Article/Rule/Section/Chapter/Part) when the document has enough of them
 * to produce a real structure; falls back to size-based chunking with
 * sentence/paragraph-boundary snapping and a 15% overlap otherwise.
 *
 * This is the same strategy every ingestion path uses except
 * embed-document/index.ts, which historically did naive fixed-800-char
 * windows for user-uploaded documents — now unified onto this module too.
 */

export interface Chunk {
  title: string;
  citation: string;
  content: string;
}

export function chunkByArticle(fullText: string, titlePrefix: string): Chunk[] {
  const articleRegex = /(?=\b(?:Article|Rule|Section|Chapter|Part)\s+\d+[.\s])/gi;
  const parts = fullText.split(articleRegex).filter((p) => p.trim().length > 30);

  const chunks: Chunk[] = [];
  for (const part of parts) {
    const headingMatch = part.match(
      /^((?:Article|Rule|Section|Chapter|Part)\s+\d+[.:—\s][^\n]*)/i,
    );
    const heading = headingMatch
      ? headingMatch[1].replace(/\s+/g, " ").trim()
      : null;
    const content = part.replace(/\s+/g, " ").trim();
    if (content.length < 40) continue;

    const numMatch = (heading || content).match(
      /(?:Article|Rule|Section|Chapter|Part)\s+(\d+)/i,
    );
    const num = numMatch ? numMatch[1] : null;

    chunks.push({
      title: heading ? `${titlePrefix} — ${heading}` : titlePrefix,
      citation: num ? `${titlePrefix}, ${(heading ?? "").split(/[.:—\s]/)[0]?.trim() || num}` : titlePrefix,
      content,
    });
  }

  // Fall back to character-based chunks if structural parsing found nothing
  return chunks.length >= 3 ? chunks : charChunk(fullText, titlePrefix);
}

export function charChunk(text: string, titlePrefix: string, size = 1000, overlap = 150): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 1;
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
