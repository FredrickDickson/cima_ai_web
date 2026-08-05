/**
 * Strips known source-site watermarks/boilerplate from legal text. Convex
 * port of scripts/lib/sanitize-legal-text.mjs (also mirrored in
 * supabase/functions/_shared/sanitize-legal-text.ts for the Edge Function
 * runtime) — kept in sync manually since each runtime needs its own copy.
 * Add further known boilerplate patterns to WATERMARK_PATTERNS in all three
 * places as they're found.
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

export function stripWatermarks(text: string): string {
  if (!text) return text;
  let cleaned = text;
  for (const pattern of WATERMARK_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .replace(/^\s+/, "")
    .trim();
}

export function containsWatermark(text: string): boolean {
  return !!text && text.toLowerCase().includes("dennislawgh");
}
