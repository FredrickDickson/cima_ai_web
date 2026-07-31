import { supabase } from "./supabase";
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
 * after "@". Runs directly against Supabase from the browser — RLS already
 * scopes `documents` to its owner and `legal_library_documents` is readable
 * by any authenticated user, so no dedicated edge function is needed here.
 */
export async function searchAuthorities(
  query: string,
  userId: string | undefined,
  limit = 6,
): Promise<AuthoritySearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [libRes, docIdsRes] = await Promise.all([
    supabase.rpc("search_legal_library_documents" as any, {
      search_query: q,
      match_count: limit,
    }),
    userId
      ? supabase.rpc("search_documents" as any, { search_query: q, match_count: limit })
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const libResults: AuthoritySearchResult[] = ((libRes.data ?? []) as {
    id: string;
    title: string;
    source_type: string;
    citation?: string;
  }[]).map((d) => ({
    id: d.id,
    type: (d.source_type === "statute" ? "statute" : "case") as AuthorityType,
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
