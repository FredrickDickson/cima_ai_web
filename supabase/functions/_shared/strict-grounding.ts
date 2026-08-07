/**
 * Shared "strict grounding" system-prompt block for @-tagged authorities.
 * Used by ai-chat, legal-search, and generate-draft so the wording never
 * drifts between the three surfaces that support authority tagging.
 *
 * Generalizes the single-document DOCUMENT-SCOPED MODE instruction that
 * previously lived only in ai-chat/index.ts to an arbitrary list of tagged
 * cases, legislation, and user documents.
 */
export function buildStrictGroundingBlock(titles: string[], contextText: string): string {
  if (titles.length === 0 || !contextText) return "";

  const titleList = titles.map((t) => `"${t}"`).join(", ");
  return `\n\nSTRICT GROUNDING MODE: The user has explicitly tagged the following authorities: ${titleList}. Answer using ONLY the text of these tagged authorities provided below. Do not use general training knowledge, do not search for or cite anything else, and do not draw on any other retrieved source. If the tagged authorities do not contain the answer, say so explicitly rather than guessing or filling the gap with outside knowledge. When citing a tagged authority, use its exact bracket marker shown before it below (e.g. "[T1]") inline in your answer.\n\n--- TAGGED AUTHORITY TEXT ---\n${contextText}\n--- END TAGGED AUTHORITY TEXT ---`;
}

/**
 * Variant of buildStrictGroundingBlock for document-review-style tasks where
 * the document under analysis (not the tagged authorities) is the primary
 * subject. Tagged authorities/playbook are framed as additional required
 * checks — augmenting the analysis, not replacing all other context.
 */
export function buildPlaybookGroundingBlock(titles: string[], contextText: string): string {
  if (titles.length === 0 || !contextText) return "";

  const titleList = titles.map((t) => `"${t}"`).join(", ");
  return `\n\nTAGGED PLAYBOOK/AUTHORITY CHECK: The user has tagged the following authorities/playbook to check this document against: ${titleList}. In addition to analysing the document's own text (your primary subject), actively compare its provisions against the tagged sources below and flag any deviations, inconsistencies, or non-compliance. When referencing a tagged source, use its exact bracket marker shown before it below (e.g. "[T1]") inline in the relevant field. Do not ignore or deprioritise analysis of the document itself.\n\n--- TAGGED AUTHORITY/PLAYBOOK TEXT ---\n${contextText}\n--- END TAGGED AUTHORITY/PLAYBOOK TEXT ---`;
}
