/**
 * Strips known source-site watermarks/boilerplate from extracted legal text
 * before it's chunked or uploaded. Currently handles the www.dennislawgh.com
 * watermark that some scraped/saved-webpage case-law files carry as a bare
 * plain-text line (not a hyperlink, so extraction doesn't strip it) —
 * displaying it to users would expose that content was scraped from that
 * site, a legal-risk concern, so it must never reach any preview, AI prompt
 * context, or generated summary/brief.
 *
 * Deno port of scripts/lib/sanitize-legal-text.mjs — kept in sync manually
 * since Edge Functions (Deno) can't import a Node ESM script directly. Add
 * further known boilerplate patterns to WATERMARK_PATTERNS in both places as
 * they're found — this function is the single point where all of them get
 * removed.
 */

const WATERMARK_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?dennislawgh\.com\/?/gi,
];

export function stripWatermarks(text: string): string {
  if (!text) return text;
  let cleaned = text;
  for (const pattern of WATERMARK_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned
    .replace(/[ \t]+\n/g, "\n") // trailing spaces left before a newline
    .replace(/\n{3,}/g, "\n\n") // collapse blank lines left by a removed line
    .replace(/^\s+/, "") // leading blank/whitespace left at the very start
    .trim();
}
