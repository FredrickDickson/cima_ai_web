import { supabase } from "./supabase";
import { convex } from "./convexClient";
import { api } from "../../convex/_generated/api";
import type { AuthorityType } from "./mentions";

export interface AuthoritySearchResult {
  id: string;
  type: AuthorityType;
  label: string;
  citation?: string;
}

/**
 * Search for taggable authorities (published cases/legislation in the Legal
 * Library, plus the current user's own uploaded documents) as the user types
 * after "@". Library docs come from Convex (public reads); the user's own
 * documents from Supabase, where RLS scopes `documents` to its owner.
 */
export async function searchAuthorities(
  query: string,
  userId: string | undefined,
  limit = 6,
): Promise<AuthoritySearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [libDocs, docIdsRes] = await Promise.all([
    convex
      .query(api.libraryDocuments.searchByTitle, { searchQuery: q, matchCount: limit })
      .catch(() => []),
    userId
      ? supabase.rpc("search_documents" as any, { search_query: q, match_count: limit })
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const libResults: AuthoritySearchResult[] = libDocs.map((d) => ({
    id: d._id,
    type: (d.sourceType === "statute" ? "statute" : "case") as AuthorityType,
    label: d.title,
    citation: d.citation || undefined,
  }));

  const docIds = ((docIdsRes.data ?? []) as { id: string }[]).map((d) => d.id);
  let docResults: AuthoritySearchResult[] = [];
  if (docIds.length > 0) {
    const { data: docRows } = await supabase
      .from("documents" as any)
      .select("id, name")
      .in("id", docIds);
    const byId = new Map((docRows ?? []).map((d: any) => [d.id, d.name]));
    docResults = docIds
      .filter((id) => byId.has(id))
      .map((id) => ({ id, type: "document" as AuthorityType, label: byId.get(id) as string }));
  }

  return [...libResults, ...docResults];
}
