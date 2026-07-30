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

  const [libRes, docRes] = await Promise.all([
    supabase
      .from("legal_library_documents" as any)
      .select("id, title, source_type, citation")
      .eq("ingestion_status", "completed")
      .in("source_type", ["case", "statute"])
      .or(`title.ilike.%${q}%,citation.ilike.%${q}%`)
      .limit(limit),
    userId
      ? supabase
          .from("documents" as any)
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", `%${q}%`)
          .limit(limit)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
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

  const docResults: AuthoritySearchResult[] = ((docRes.data ?? []) as { id: string; name: string }[]).map((d) => ({
    id: d.id,
    type: "document" as AuthorityType,
    label: d.name,
  }));

  return [...libResults, ...docResults];
}
