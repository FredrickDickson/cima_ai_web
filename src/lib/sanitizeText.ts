/**
 * Strips known source-site watermarks/boilerplate from legal text. Frontend
 * copy of scripts/lib/sanitize-legal-text.mjs (also mirrored in
 * supabase/functions/_shared/sanitize-legal-text.ts and
 * convex/lib/sanitizeText.ts) — kept in sync manually since each runtime
 * needs its own copy. Add further known boilerplate patterns to
 * WATERMARK_PATTERNS in all four places as they're found.
 *
 * Used at render time (not just ingest time) because document viewers like
 * LibraryDocument.tsx's DocxViewer convert the ORIGINAL uploaded file to
 * HTML client-side on every view — the backfilled/sanitized database
 * `content` column is a separate copy used only for search/AI, so it never
 * touches what a viewer renders straight from the source file.
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
