/**
 * Strips known source-site watermarks/boilerplate from extracted legal text
 * before it's chunked or uploaded. Currently handles the www.dennislawgh.com
 * watermark that some scraped/saved-webpage case-law files carry as a bare
 * plain-text line (not a hyperlink, so html-to-text extraction doesn't strip
 * it) — displaying it to users would expose that content was scraped from
 * that site, a legal-risk concern, so it must never reach any preview, AI
 * prompt context, or generated summary/brief.
 *
 * Add further known boilerplate patterns to WATERMARK_PATTERNS as they're
 * found — this function is the single point where all of them get removed.
 */

const WATERMARK_PATTERNS = [
  // Full URL/domain form first, so it's consumed as one unit (the bare-word
  // pattern below would otherwise leave a stray "www..com" behind).
  /(?:https?:\/\/)?(?:www\.)?dennislawgh\.com\/?/gi,
  // Bare mentions of the site name with no ".com" — e.g. body text citing
  // another case as "available on the online portal dennislawgh as [...]".
  // Still exposes the scraping source, so still needs to go.
  /\bdennislawgh\b/gi,
];

export function stripWatermarks(text) {
  if (!text) return text;
  let cleaned = text;
  for (const pattern of WATERMARK_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned
    .replace(/[ \t]+\n/g, '\n')   // trailing spaces left before a newline
    .replace(/\n{3,}/g, '\n\n')   // collapse blank lines left by a removed line
    .replace(/ {2,}/g, ' ')       // double spaces left by a removed bare word
    .replace(/^\s+/, '')          // leading blank/whitespace left at the very start
    .trim();
}
