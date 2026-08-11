// Mirrors supabase/functions/_shared/rrf.ts — duplicated rather than shared
// because Convex and the Supabase edge functions are separate deploy
// targets with their own bundlers (same pattern already used throughout
// this file's neighbors, e.g. fullTextSearch's own comment: "mirrors
// search_legal_library_fts"). Keep both in sync if the formula changes.
export function reciprocalRankFusion<T extends { _id: string }>(
  resultLists: T[][],
  k = 60,
): T[] {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();

  for (const list of resultLists) {
    list.forEach((item, rank) => {
      const prev = scores.get(item._id) ?? 0;
      scores.set(item._id, prev + 1 / (k + rank + 1));
      if (!items.has(item._id)) items.set(item._id, item);
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => items.get(id)!);
}
