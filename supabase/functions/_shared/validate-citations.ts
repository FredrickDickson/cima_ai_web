/**
 * Server-side check that every citation marker ([1], [L2], [C3], [T1], [R4],
 * [W5] ...) the model used in its output actually corresponds to a source
 * that was really retrieved. Until now this was only checked client-side,
 * cosmetically, in src/lib/citations.tsx (an unmatched marker just renders
 * an amber warning chip) — the server never verified its own output, and
 * nothing was logged/observable when a model hallucinated a marker.
 *
 * Does not block or alter the response — retrying generation is slow/costly
 * and the guide's own framing is that declining is better than fabricating,
 * not that every fabrication needs a retry loop. This just makes the failure
 * mode observable (via the returned warnings array, and a server log) so the
 * existing client-side UI has real backing and the rate of hallucinated
 * citations becomes something you can actually track over time.
 */

const MARKER_PATTERN = /\[([A-Za-z]{0,2}\d+)\]/g;

export function validateCitations(text: string, knownMarkers: Set<string>): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(MARKER_PATTERN)) {
    const marker = match[1];
    if (seen.has(marker)) continue;
    seen.add(marker);
    if (!knownMarkers.has(marker)) {
      warnings.push(`Cited [${marker}] does not match any retrieved source`);
    }
  }
  if (warnings.length > 0) {
    console.error("validateCitations: model cited unretrieved source(s)", warnings);
  }
  return warnings;
}

/** Builds the known-marker set from a citedSources-shaped array (each item has a `marker` field). */
export function markerSetFrom(citedSources: { marker: string }[]): Set<string> {
  return new Set(citedSources.map((s) => s.marker));
}
