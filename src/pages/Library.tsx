import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Filter,
  Gavel,
  Globe,
  Landmark,
  Loader2,
  Scale,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { convex } from "../lib/convexClient";
import { api } from "../../convex/_generated/api";
import type { LegalLibraryDocument, UnifiedLibraryDocument } from "../types/database";
import { jurisdictionLabel } from "../lib/jurisdictions";

// ─── Types ────────────────────────────────────────────────────────────────

type SourceTypeFilter = "all" | "case" | "statute";

const COURTS = ["Supreme Court", "Court of Appeal", "High Court"];

const PAGE_SIZE = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────

function courtIcon(court: string) {
  if (court === "Supreme Court") return <Landmark size={14} className="text-gold-500" />;
  if (court === "Court of Appeal") return <Gavel size={14} className="text-gold-500" />;
  if (court === "High Court") return <Scale size={14} className="text-gold-500" />;
  return <BookOpen size={14} className="text-gold-500" />;
}

function partyLabel(doc: UnifiedLibraryDocument): string {
  if (doc.parties?.length >= 2) {
    return `${doc.parties[0].name} v. ${doc.parties[1].name}`;
  }
  return doc.title;
}

function withSource(docs: LegalLibraryDocument[]): UnifiedLibraryDocument[] {
  return docs.map((d) => ({ ...d, source: "supabase" }));
}

// Documents ingested after Supabase's free tier filled up live in Convex
// instead — camelCase fields there get renamed to match LegalLibraryDocument's
// snake_case shape so the rest of this component needs no source-specific
// branching for display.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convexDocToUnified(doc: any): UnifiedLibraryDocument {
  return {
    source: "convex",
    id: doc._id,
    title: doc.title,
    source_type: doc.sourceType,
    jurisdiction: doc.jurisdiction,
    citation: doc.citation ?? "",
    court: doc.court ?? "",
    decided_year: doc.decidedYear ?? null,
    parties: doc.parties ?? [],
    legislation_number: doc.legislationNumber ?? "",
    storage_path: null,
    original_format: doc.originalFormat,
    source_collection: doc.sourceCollection ?? "",
    extracted_char_count: doc.extractedCharCount,
    ingestion_status: doc.ingestionStatus,
    error_message: doc.errorMessage ?? null,
    created_at: new Date(doc.createdAt).toISOString(),
    updated_at: new Date(doc.updatedAt).toISOString(),
  };
}

// When browsing "All Jurisdictions", the grid groups results into contiguous
// per-jurisdiction sections, so a merge of both backends' results must sort
// by jurisdiction first (matching Supabase's own `.order("jurisdiction")` in
// that mode) before falling back to decided_year — a plain year-only sort
// would interleave jurisdictions and break the section grouping below.
function mergeSort(docs: UnifiedLibraryDocument[], groupByJurisdiction: boolean): UnifiedLibraryDocument[] {
  return [...docs].sort((a, b) => {
    if (groupByJurisdiction) {
      const j = a.jurisdiction.localeCompare(b.jurisdiction);
      if (j !== 0) return j;
    }
    return (b.decided_year ?? -Infinity) - (a.decided_year ?? -Infinity);
  });
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function Library() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<UnifiedLibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // Convex uses cursor-based pagination, separate from Supabase's offset —
  // "load more" tops up whichever source still has more, then re-merges.
  // Known compromise: page boundaries won't be perfectly interleaved across
  // a load-more click since the two sources paginate independently.
  const [convexCursor, setConvexCursor] = useState<string | null>(null);
  const [convexDone, setConvexDone] = useState(false);

  const [sourceType, setSourceType] = useState<SourceTypeFilter>("all");
  const [court, setCourt] = useState<string>("all");
  const [year, setYear] = useState<string>("");
  const [jurisdiction, setJurisdiction] = useState<string>("all");
  const [jurisdictionCounts, setJurisdictionCounts] = useState<{ jurisdiction: string; doc_count: number }[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [semanticDocs, setSemanticDocs] = useState<UnifiedLibraryDocument[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [keywordDocs, setKeywordDocs] = useState<UnifiedLibraryDocument[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);

  const semanticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const semanticAbort = useRef<AbortController | null>(null);
  const keywordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keywordRequestId = useRef(0);

  // Google-style suggestions dropdown
  const [suggestions, setSuggestions] = useState<UnifiedLibraryDocument[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionRequestId = useRef(0);

  async function hydrateDocsByIds(ids: string[]): Promise<UnifiedLibraryDocument[]> {
    if (ids.length === 0) return [];
    const { data: rows } = await supabase
      .from("legal_library_documents" as any)
      .select("*")
      .in("id", ids);
    const byId = new Map(withSource((rows ?? []) as LegalLibraryDocument[]).map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((d): d is UnifiedLibraryDocument => !!d);
  }

  async function convexSearchByTitle(query: string, matchCount: number): Promise<UnifiedLibraryDocument[]> {
    try {
      const results = await convex.query(api.libraryDocuments.searchByTitle, {
        searchQuery: query,
        sourceType: sourceType === "all" ? undefined : sourceType,
        court: court !== "all" ? court : undefined,
        matchCount,
      });
      return results.map(convexDocToUnified);
    } catch {
      return []; // fail soft — Convex being unreachable shouldn't break Supabase-backed search
    }
  }

  // ─── Keyword / filtered fetch ─────────────────────────────────────────

  async function fetchSupabasePage(offset: number) {
    let query = supabase
      .from("legal_library_documents" as any)
      .select("*")
      .eq("ingestion_status", "completed");

    // When browsing "All Jurisdictions", order by jurisdiction first so
    // same-jurisdiction rows stay contiguous across pages — the grid then
    // renders a section header wherever the jurisdiction value changes,
    // without needing separate paginated queries per jurisdiction.
    if (jurisdiction === "all") {
      query = query.order("jurisdiction", { ascending: true });
    } else {
      query = query.eq("jurisdiction", jurisdiction);
    }
    query = query.order("decided_year", { ascending: false, nullsFirst: false }).range(offset, offset + PAGE_SIZE - 1);

    if (sourceType !== "all") query = query.eq("source_type", sourceType);
    if (court !== "all") query = query.eq("court", court);
    if (year.trim()) query = query.eq("decided_year", Number(year.trim()));

    return query as unknown as Promise<{ data: LegalLibraryDocument[] | null; error: { message: string } | null }>;
  }

  async function fetchConvexPage(cursor: string | null) {
    try {
      return await convex.query(api.libraryDocuments.list, {
        jurisdiction: jurisdiction === "all" ? undefined : jurisdiction,
        sourceType: sourceType === "all" ? undefined : sourceType,
        court: court !== "all" ? court : undefined,
        decidedYear: year.trim() ? Number(year.trim()) : undefined,
        paginationOpts: { numItems: PAGE_SIZE, cursor },
      });
    } catch {
      return { page: [], isDone: true, continueCursor: cursor ?? "" }; // fail soft
    }
  }

  async function loadJurisdictionCounts() {
    const [{ data }, convexCounts] = await Promise.all([
      supabase.rpc("get_library_jurisdiction_counts" as any, {
        source_type_filter: sourceType === "all" ? null : sourceType,
        court_filter: court === "all" ? null : court,
        year_filter: year.trim() ? Number(year.trim()) : null,
      }),
      convex
        .query(api.libraryDocuments.jurisdictionCounts, {
          sourceType: sourceType === "all" ? undefined : sourceType,
          court: court !== "all" ? court : undefined,
          decidedYear: year.trim() ? Number(year.trim()) : undefined,
        })
        .catch(() => [] as { jurisdiction: string; count: number }[]),
    ]);
    const merged = new Map<string, number>();
    for (const row of (data ?? []) as { jurisdiction: string; doc_count: number }[]) {
      merged.set(row.jurisdiction, Number(row.doc_count));
    }
    for (const row of convexCounts) {
      merged.set(row.jurisdiction, (merged.get(row.jurisdiction) ?? 0) + row.count);
    }
    setJurisdictionCounts(
      Array.from(merged.entries()).map(([jurisdiction, doc_count]) => ({ jurisdiction, doc_count })),
    );
  }

  async function runKeywordSearch(query: string) {
    const requestId = ++keywordRequestId.current;
    setKeywordLoading(true);
    const [{ data }, convexResults] = await Promise.all([
      supabase.rpc("search_legal_library_documents" as any, {
        search_query: query,
        source_type_filter: sourceType === "all" ? null : sourceType,
        court_filter: court === "all" ? null : court,
        year_filter: year.trim() ? Number(year.trim()) : null,
        match_count: 60,
        jurisdiction_filter: jurisdiction === "all" ? null : jurisdiction,
      }),
      convexSearchByTitle(query, 60),
    ]);
    if (requestId !== keywordRequestId.current) return; // stale response, a newer keystroke has since fired
    const ids = ((data ?? []) as { id: string }[]).map((d) => d.id);
    const hydrated = await hydrateDocsByIds(ids);
    if (requestId !== keywordRequestId.current) return;
    setKeywordDocs(mergeSort([...hydrated, ...convexResults], false));
    setKeywordLoading(false);
  }

  useEffect(() => {
    if (search.trim()) return; // search-active paths (keyword FTS / semantic) handle their own fetch
    setLoading(true);
    setHasMore(true);
    setConvexCursor(null);
    setConvexDone(false);
    Promise.all([fetchSupabasePage(0), fetchConvexPage(null)]).then(([{ data, error }, convexPage]) => {
      const supabaseDocs = error ? [] : withSource(data ?? []);
      const convexDocs = convexPage.page.map(convexDocToUnified);
      setDocuments(mergeSort([...supabaseDocs, ...convexDocs], jurisdiction === "all"));
      setHasMore((data?.length ?? 0) === PAGE_SIZE || !convexPage.isDone);
      setConvexCursor(convexPage.continueCursor);
      setConvexDone(convexPage.isDone);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, court, year, jurisdiction, search]);

  useEffect(() => {
    if (searchMode !== "keyword" || !search.trim()) {
      setKeywordDocs([]);
      return;
    }
    runKeywordSearch(search.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode, search, sourceType, court, year, jurisdiction]);

  useEffect(() => {
    loadJurisdictionCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, court, year]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const supabaseCount = documents.filter((d) => d.source === "supabase").length;
    const [{ data, error }, convexPage] = await Promise.all([
      fetchSupabasePage(supabaseCount),
      convexDone ? Promise.resolve(null) : fetchConvexPage(convexCursor),
    ]);
    const newSupabaseDocs = error ? [] : withSource(data ?? []);
    const newConvexDocs = convexPage ? convexPage.page.map(convexDocToUnified) : [];
    setDocuments((prev) => mergeSort([...prev, ...newSupabaseDocs, ...newConvexDocs], jurisdiction === "all"));
    const supabaseHasMore = (data?.length ?? 0) === PAGE_SIZE;
    if (convexPage) {
      setConvexCursor(convexPage.continueCursor);
      setConvexDone(convexPage.isDone);
    }
    setHasMore(supabaseHasMore || !(convexPage ? convexPage.isDone : convexDone));
    setLoadingMore(false);
  }

  // ─── Semantic search ────────────────────────────────────────────────────

  async function handleSemanticSearch(query: string) {
    if (!query.trim()) {
      setSemanticDocs([]);
      return;
    }
    semanticAbort.current?.abort();
    semanticAbort.current = new AbortController();
    const signal = semanticAbort.current.signal;

    setSemanticLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          query,
          jurisdiction: jurisdiction === "all" ? undefined : jurisdiction,
          source_types: sourceType === "all" ? undefined : [sourceType],
        }),
        signal,
      });
      if (!res.ok) {
        setSemanticDocs([]);
        return;
      }
      const data = await res.json();
      // legal-search merges Supabase + Convex chunk hits and tags each with
      // `source` (see supabase/functions/_shared/legal-retrieval.ts) — split
      // so each backend's doc IDs get hydrated from the right place.
      const sources: { doc_id?: string; source?: "supabase" | "convex" }[] = data.sources ?? [];
      const orderedRefs = [
        ...new Map(
          sources
            .filter((s): s is { doc_id: string; source?: "supabase" | "convex" } => !!s.doc_id)
            .map((s) => [s.doc_id, { id: s.doc_id, source: s.source ?? "supabase" }] as const),
        ).values(),
      ];
      if (orderedRefs.length === 0) {
        setSemanticDocs([]);
        return;
      }
      const supabaseIds = orderedRefs.filter((r) => r.source === "supabase").map((r) => r.id);
      const convexIds = orderedRefs.filter((r) => r.source === "convex").map((r) => r.id);
      const [{ data: rows }, convexDocs] = await Promise.all([
        supabaseIds.length
          ? supabase.from("legal_library_documents" as any).select("*").in("id", supabaseIds)
          : Promise.resolve({ data: [] as LegalLibraryDocument[] }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        convexIds.length
          ? convex.query(api.libraryDocuments.getManyByIds, { ids: convexIds as any }).catch(() => [])
          : Promise.resolve([]),
      ]);
      const byId = new Map([
        ...withSource((rows ?? []) as LegalLibraryDocument[]).map((r) => [r.id, r] as const),
        ...convexDocs.map(convexDocToUnified).map((r) => [r.id, r] as const),
      ]);
      setSemanticDocs(orderedRefs.map((r) => byId.get(r.id)).filter((d): d is UnifiedLibraryDocument => !!d));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setSemanticDocs([]);
    } finally {
      setSemanticLoading(false);
    }
  }

  // ─── Google-style suggestions dropdown ──────────────────────────────────

  async function fetchSuggestions(query: string) {
    const requestId = ++suggestionRequestId.current;
    const [{ data }, convexResults] = await Promise.all([
      supabase.rpc("search_legal_library_documents" as any, {
        search_query: query,
        match_count: 8,
      }),
      convexSearchByTitle(query, 8),
    ]);
    if (requestId !== suggestionRequestId.current) return; // stale, a newer keystroke has since fired
    const ids = ((data ?? []) as { id: string }[]).map((d) => d.id);
    const hydrated = await hydrateDocsByIds(ids);
    if (requestId !== suggestionRequestId.current) return;
    setSuggestions(mergeSort([...hydrated, ...convexResults], false).slice(0, 8));
    setActiveSuggestion(0);
  }

  function selectSuggestion(doc: UnifiedLibraryDocument) {
    setShowSuggestions(false);
    setSuggestions([]);
    navigate(`/library/${doc.source}/${doc.id}`);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (suggestions[activeSuggestion]) {
        e.preventDefault();
        selectSuggestion(suggestions[activeSuggestion]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setShowSuggestions(!!value.trim());
    if (searchMode === "semantic") {
      if (semanticTimer.current) clearTimeout(semanticTimer.current);
      semanticTimer.current = setTimeout(() => handleSemanticSearch(value), 600);
    }
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (value.trim()) {
      suggestionTimer.current = setTimeout(() => fetchSuggestions(value.trim()), 200);
    } else {
      setSuggestions([]);
    }
  }

  function switchSearchMode(mode: "keyword" | "semantic") {
    setSearchMode(mode);
    if (mode === "semantic" && search.trim()) {
      handleSemanticSearch(search);
    } else {
      setSemanticDocs([]);
    }
  }

  // ─── Derived list ───────────────────────────────────────────────────────

  const isSemanticActive = searchMode === "semantic" && search.trim().length > 0;
  const isKeywordSearchActive = searchMode === "keyword" && search.trim().length > 0;
  const isSearchActive = isSemanticActive || isKeywordSearchActive;
  const visibleDocs = isSemanticActive ? semanticDocs : isKeywordSearchActive ? keywordDocs : documents;
  const searchLoading = isSemanticActive ? semanticLoading : isKeywordSearchActive ? keywordLoading : false;

  const showJurisdictionGroups = !isSearchActive && jurisdiction === "all";
  const totalJurisdictionCount = jurisdictionCounts.reduce((sum, j) => sum + Number(j.doc_count), 0);

  // fetchPage orders by jurisdiction when browsing "All", so same-jurisdiction
  // rows are already contiguous — group them into sections for rendering
  // without needing a separate paginated query per jurisdiction.
  const sections = showJurisdictionGroups
    ? visibleDocs.reduce<{ jurisdiction: string; docs: UnifiedLibraryDocument[] }[]>((acc, doc) => {
        const last = acc[acc.length - 1];
        if (last && last.jurisdiction === doc.jurisdiction) last.docs.push(doc);
        else acc.push({ jurisdiction: doc.jurisdiction, docs: [doc] });
        return acc;
      }, [])
    : [{ jurisdiction: "", docs: visibleDocs }];

  return (
    <AppLayout>
      <Header title="Legal Library" subtitle="Case law, legislation & legal materials — Ghana and beyond" />
      <div className="flex-1 overflow-hidden flex relative">
        {/* Mobile filter overlay backdrop */}
        {mobileFilterOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Jurisdiction Sidebar — hidden on mobile, drawer on mobile ──────── */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex-col overflow-y-auto transition-transform duration-300 md:static md:w-52 md:max-w-none md:z-auto md:translate-x-0 md:flex ${
          mobileFilterOpen ? "translate-x-0 flex" : "-translate-x-full md:flex hidden"
        }`}>
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={12} /> Jurisdictions
            </p>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="md:hidden p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close filters"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            <button
              onClick={() => { setJurisdiction("all"); setMobileFilterOpen(false); }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                jurisdiction === "all"
                  ? "bg-navy-50 text-navy-900 font-semibold border-l-2 border-navy-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
              }`}
            >
              <span>All Jurisdictions</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                {totalJurisdictionCount}
              </span>
            </button>
            {jurisdictionCounts.map((j) => (
              <button
                key={j.jurisdiction}
                onClick={() => { setJurisdiction(j.jurisdiction); setMobileFilterOpen(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                  jurisdiction === j.jurisdiction
                    ? "bg-navy-50 text-navy-900 font-semibold border-l-2 border-navy-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                }`}
              >
                <span className="truncate">{jurisdictionLabel(j.jurisdiction)}</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 shrink-0">
                  {j.doc_count}
                </span>
              </button>
            ))}
            {jurisdictionCounts.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-slate-400">No jurisdictions yet.</p>
            )}
          </nav>
        </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Mobile jurisdiction filter toggle */}
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="md:hidden mb-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600"
        >
          <Filter size={12} /> Jurisdiction: {jurisdiction === "all" ? "All" : jurisdictionLabel(jurisdiction)}
        </button>
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setShowSuggestions(!!search.trim() && suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search case names, citations, or ask a legal question..."
              className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((doc, i) => (
                  <button
                    key={`${doc.source}-${doc.id}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(doc);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                      i === activeSuggestion ? "bg-gold-50" : "hover:bg-slate-50"
                    }`}
                  >
                    {doc.source_type === "case" ? courtIcon(doc.court) : <BookOpen size={14} className="text-gold-500 shrink-0" />}
                    <span className="flex-1 min-w-0 truncate text-sm text-navy-950">
                      {doc.source_type === "case" ? partyLabel(doc) : doc.title}
                    </span>
                    {(doc.citation || doc.decided_year) && (
                      <span className="text-xs text-slate-400 shrink-0">
                        {doc.citation || doc.decided_year}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
            <button
              onClick={() => switchSearchMode("keyword")}
              className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                searchMode === "keyword" ? "bg-navy-950 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Keyword
            </button>
            <button
              onClick={() => switchSearchMode("semantic")}
              className={`px-3 py-2.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                searchMode === "semantic" ? "bg-navy-950 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Sparkles size={13} />
              AI Search
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "case", "statute"] as SourceTypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setSourceType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sourceType === t
                  ? "bg-gold-500/10 border-gold-400 text-gold-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "all" ? "All" : t === "case" ? "Case Law" : "Legislation"}
            </button>
          ))}
          {sourceType !== "statute" && (
            <select
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 bg-white text-slate-600"
            >
              <option value="all">All Courts</option>
              {COURTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white">
            <Calendar size={12} className="text-slate-400" />
            <input
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Year"
              className="w-14 text-xs text-slate-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Results */}
        {(isSearchActive ? searchLoading : loading) ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={22} className="animate-spin mr-2" />
            {isSemanticActive ? "Searching with AI..." : "Searching..."}
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No documents found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((section, si) => (
              <div key={section.jurisdiction || si}>
                {showJurisdictionGroups && (
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Globe size={12} />
                    {jurisdictionLabel(section.jurisdiction)}
                    <span className="text-slate-300 font-normal normal-case">
                      — {section.docs.length} document{section.docs.length === 1 ? "" : "s"} loaded
                    </span>
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {section.docs.map((doc) => (
                    <button
                      key={`${doc.source}-${doc.id}`}
                      onClick={() => navigate(`/library/${doc.source}/${doc.id}`)}
                      className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-gold-400 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                        {doc.source_type === "case" ? courtIcon(doc.court) : <BookOpen size={14} className="text-gold-500" />}
                        <span>{doc.source_type === "case" ? doc.court || "Case" : "Legislation"}</span>
                        {doc.decided_year && <span>· {doc.decided_year}</span>}
                      </div>
                      <h3 className="text-sm font-semibold text-navy-950 line-clamp-2 mb-1.5">
                        {doc.source_type === "case" ? partyLabel(doc) : doc.title}
                      </h3>
                      {doc.citation && <p className="text-xs text-slate-500">{doc.citation}</p>}
                      {doc.legislation_number && (
                        <p className="text-xs text-slate-500">{doc.legislation_number}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isSearchActive && hasMore && documents.length > 0 && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-4 py-2 text-sm font-medium text-navy-950 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
}
