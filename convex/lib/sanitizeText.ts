/**
 * Strips known source-site watermarks/boilerplate from legal text. Convex
 * port of scripts/lib/sanitize-legal-text.mjs (also mirrored in
 * supabase/functions/_shared/sanitize-legal-text.ts for the Edge Function
 * runtime) — kept in sync manually since each runtime needs its own copy.
 * Add further known boilerplate patterns to WATERMARK_PATTERNS in all three
 * places as they're found.
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
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+/, "")
    .trim();
}

export function containsWatermark(text: string): boolean {
  return !!text && text.toLowerCase().includes("dennislawgh");
}
