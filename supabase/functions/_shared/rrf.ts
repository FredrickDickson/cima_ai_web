/**
 * Reciprocal Rank Fusion — merges multiple ranked result lists into one,
 * operating on rank position rather than raw score. This sidesteps the
 * "vector similarity vs FTS ts_rank aren't comparable numbers" problem that
 * made naive similarity-sort merging (the old behavior here) put every
 * FTS-only hit last regardless of how relevant it actually was.
 *
 * score(item) = sum over every list it appears in of 1 / (k + rank)
 * k=60 is the constant used in the original RRF paper and is what most
 * production hybrid-search implementations default to.
 */
export function reciprocalRankFusion<T extends { id: string }>(
  resultLists: T[][],
  k = 60,
): T[] {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();

  for (const list of resultLists) {
    list.forEach((item, rank) => {
      const prev = scores.get(item.id) ?? 0;
      scores.set(item.id, prev + 1 / (k + rank + 1));
      if (!items.has(item.id)) items.set(item.id, item);
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => items.get(id)!);
}
