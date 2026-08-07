// Shared "@ mention" authority-tagging logic used by Research.tsx, AIAssistant.tsx,
// and DraftingStudio.tsx. Tagging is implemented as a plain-text marker spliced into
// the textarea value (no contenteditable/rich-text), reconciled against a parallel
// state array — see src/hooks/useAuthorityMentions.ts for how these are combined.

export type AuthorityType = "case" | "statute" | "document";

export interface TaggedAuthority {
  id: string;
  type: AuthorityType;
  label: string;
  citation?: string;
  /** The literal `@[...]` substring spliced into the textarea text for this tag. */
  marker: string;
}

/**
 * Builds a literal marker string to splice into the textarea, disambiguating
 * against markers already in use so two distinct tags never collide as
 * identical substrings (which would make removal/reconciliation ambiguous).
 */
export function buildMentionMarker(
  label: string,
  citation: string | undefined,
  existingMarkers: string[],
): string {
  const base = `@[${label}]`;
  if (!existingMarkers.includes(base)) return base;

  if (citation) {
    const withCitation = `@[${label} (${citation})]`;
    if (!existingMarkers.includes(withCitation)) return withCitation;
  }

  let n = 2;
  while (existingMarkers.includes(`@[${label}] (${n})`)) n++;
  return `@[${label}] (${n})`;
}

/**
 * Splits tagged authorities into the two ID arrays the backend expects,
 * deduping by id (tagging the same authority twice must not send duplicate
 * IDs even though each tag keeps its own disambiguated marker in the text).
 */
export function splitTaggedAuthorityIds(
  tagged: TaggedAuthority[],
): { libraryDocIds: string[]; documentIds: string[] } {
  const libraryDocIds = Array.from(new Set(tagged.filter((t) => t.type !== "document").map((t) => t.id)));
  const documentIds = Array.from(new Set(tagged.filter((t) => t.type === "document").map((t) => t.id)));
  return { libraryDocIds, documentIds };
}

export interface MentionTrigger {
  /** Index of the "@" character that triggered the mention. */
  start: number;
  /** Text typed after "@", used to filter suggestions. */
  query: string;
}

/**
 * Scans backward from the caret for an active "@" mention trigger: an "@"
 * preceded by start-of-string or whitespace, with no whitespace/newline
 * between the "@" and the caret. Returns null when no trigger is active
 * (e.g. caret is inside a word, or the last "@" was closed out by a space).
 */
export function detectMentionTrigger(text: string, caret: number): MentionTrigger | null {
  const upToCaret = text.slice(0, caret);
  const at = upToCaret.lastIndexOf("@");
  if (at === -1) return null;

  const before = at > 0 ? upToCaret[at - 1] : "";
  if (before && !/\s/.test(before)) return null;

  const query = upToCaret.slice(at + 1);
  if (/\s/.test(query)) return null;

  return { start: at, query };
}
