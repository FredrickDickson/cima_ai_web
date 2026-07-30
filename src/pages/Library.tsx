import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Gavel,
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
import type { LegalLibraryDocument } from "../types/database";

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

function partyLabel(doc: LegalLibraryDocument): string {
  if (doc.parties?.length >= 2) {
    return `${doc.parties[0].name} v. ${doc.parties[1].name}`;
  }
  return doc.title;
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function Library() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<LegalLibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [sourceType, setSourceType] = useState<SourceTypeFilter>("all");
  const [court, setCourt] = useState<string>("all");
  const [year, setYear] = useState<string>("");

  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [semanticDocs, setSemanticDocs] = useState<LegalLibraryDocument[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);

  const semanticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const semanticAbort = useRef<AbortController | null>(null);

  // ─── Keyword / filtered fetch ─────────────────────────────────────────

  async function fetchPage(offset: number) {
    let query = supabase
      .from("legal_library_documents" as any)
      .select("*")
      .eq("ingestion_status", "completed")
      .order("decided_year", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (sourceType !== "all") query = query.eq("source_type", sourceType);
    if (court !== "all") query = query.eq("court", court);
    if (year.trim()) query = query.eq("decided_year", Number(year.trim()));
    if (search.trim()) query = query.or(`title.ilike.%${search.trim()}%,citation.ilike.%${search.trim()}%`);

    return query as unknown as Promise<{ data: LegalLibraryDocument[] | null; error: { message: string } | null }>;
  }

  useEffect(() => {
    if (searchMode === "semantic" && search.trim()) return; // semantic path handles its own loading
    setLoading(true);
    setHasMore(true);
    fetchPage(0).then(({ data, error }) => {
      if (!error) {
        setDocuments(data ?? []);
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, court, year, searchMode, search]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data, error } = await fetchPage(documents.length);
    if (!error) {
      setDocuments((prev) => [...prev, ...(data ?? [])]);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    }
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
          jurisdiction: "ghana",
          source_types: sourceType === "all" ? undefined : [sourceType],
        }),
        signal,
      });
      if (!res.ok) {
        setSemanticDocs([]);
        return;
      }
      const data = await res.json();
      const sources: { doc_id?: string; similarity?: number }[] = data.sources ?? [];
      const orderedIds = [...new Set(sources.map((s) => s.doc_id).filter((id): id is string => !!id))];
      if (orderedIds.length === 0) {
        setSemanticDocs([]);
        return;
      }
      const { data: rows } = await supabase
        .from("legal_library_documents" as any)
        .select("*")
        .in("id", orderedIds);
      const byId = new Map(((rows ?? []) as LegalLibraryDocument[]).map((r) => [r.id, r]));
      setSemanticDocs(orderedIds.map((id) => byId.get(id)).filter((d): d is LegalLibraryDocument => !!d));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setSemanticDocs([]);
    } finally {
      setSemanticLoading(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchMode === "semantic") {
      if (semanticTimer.current) clearTimeout(semanticTimer.current);
      semanticTimer.current = setTimeout(() => handleSemanticSearch(value), 600);
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
  const visibleDocs = isSemanticActive ? semanticDocs : documents;

  return (
    <AppLayout>
      <Header title="Legal Library" subtitle="Ghana case law, legislation & constitutional instruments" />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
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
        {loading || semanticLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={22} className="animate-spin mr-2" />
            {semanticLoading ? "Searching with AI..." : "Loading library..."}
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No documents found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => navigate(`/library/${doc.id}`)}
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
        )}

        {!isSemanticActive && hasMore && documents.length > 0 && (
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
    </AppLayout>
  );
}
