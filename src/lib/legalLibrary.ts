// Shared display helpers for Legal Library documents, so cases and legislation
// are labelled identically wherever they appear (library grid, search
// suggestions, document view).

import type { LegalLibraryDocument } from "../types/database";

/** "Party A v. Party B" when both parties are known, else the raw title. */
export function partyLabel(doc: Pick<LegalLibraryDocument, "parties" | "title">): string {
  if (doc.parties?.length >= 2) {
    return `${doc.parties[0].name} v. ${doc.parties[1].name}`;
  }
  return doc.title;
}

/**
 * Court for cases; "Legislation" for domestic statutes. International
 * instruments (arbitration rules, conventions, model laws) are tagged
 * `source_type: "statute"` for filtering purposes but aren't legislation in
 * the technical sense, so they get their own label.
 */
export function documentTypeLabel(doc: Pick<LegalLibraryDocument, "source_type" | "court" | "jurisdiction">): string {
  if (doc.source_type === "case") return doc.court || "Case";
  if (doc.jurisdiction === "international") return "International Instrument";
  return "Legislation";
}
