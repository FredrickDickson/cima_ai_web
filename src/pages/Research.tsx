import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  BookOpen,
  Gavel,
  Globe,
  Clock,
  Bookmark,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  ExternalLink,
  Database,
  Sparkles,
  Library,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  X,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const JURISDICTIONS = [
  { value: "", label: "All Jurisdictions" },
  { value: "ghana", label: "Ghana" },
  { value: "international", label: "International" },
  { value: "england_wales", label: "England & Wales" },
  { value: "uncitral", label: "UNCITRAL" },
  { value: "icc", label: "ICC" },
  { value: "lcia", label: "LCIA" },
];

const SOURCE_TYPES = [
  { value: "statute", label: "Statutes" },
  { value: "case", label: "Case Law" },
  { value: "rule", label: "Rules" },
  { value: "treaty", label: "Treaties" },
];

const LIBRARY_CATEGORIES = [
  { label: "Arbitration Statutes", items: ["Ghana ADR Act 2010", "UNCITRAL Model Law", "NY Convention 1958"] },
  { label: "Institutional Rules", items: ["ICC Rules 2021", "UNCITRAL Rules 2010", "LCIA Rules 2020"] },
  { label: "Practice Areas", items: ["Commercial Arbitration", "Investment Arbitration", "Enforcement"] },
];

interface RetrievedSource {
  id: string;
  source_name: string;
  citation?: string;
  source_type: string;
  jurisdiction?: string;
  content: string;
  similarity?: number;
  url?: string;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface SearchResponse {
  sources: RetrievedSource[];
  ai_analysis: string;
  tavily_results: TavilyResult[];
  sources_count: number;
}

function sourceTypeColor(type: string) {
  const map: Record<string, string> = {
    case: "bg-blue-100 text-blue-700 border-blue-200",
    statute: "bg-teal-100 text-teal-700 border-teal-200",
    rule: "bg-amber-100 text-amber-700 border-amber-200",
    treaty: "bg-rose-100 text-rose-700 border-rose-200",
    document: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[type] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

function SourceCard({ source, index }: { source: RetrievedSource; index: number }) {
  const [expanded, setExpanded] = useState(index < 2);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-50 text-navy-600 shrink-0 mt-0.5">
          <Database size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-navy-950 leading-snug">{source.source_name}</h4>
              {source.citation && <p className="text-xs text-slate-500 font-mono mt-0.5">{source.citation}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${sourceTypeColor(source.source_type)}`}>
                {source.source_type}
              </span>
              {source.jurisdiction && (
                <div className="flex items-center gap-1">
                  <Globe size={11} className="text-slate-400" />
                  <span className="text-xs text-slate-500 capitalize">{source.jurisdiction}</span>
                </div>
              )}
              {source.similarity !== undefined && (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {Math.round(source.similarity * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="text-slate-400 shrink-0 mt-1">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <blockquote className="mt-3 pl-3 border-l-2 border-gold-400 bg-amber-50/50 rounded-r-lg py-2 pr-3">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{source.content}</p>
          </blockquote>
          {source.url && (
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-navy-600 hover:text-navy-900 font-medium">
              <ExternalLink size={12} /> View source
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function Research() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const linkedCaseId = searchParams.get("case_id") ?? "";
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState(searchParams.get("jurisdiction") ?? "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [savedSessions, setSavedSessions] = useState<{ id: string; query: string; jurisdiction: string; created_at: string }[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [validityResult, setValidityResult] = useState("");
  const [validityLoading, setValidityLoading] = useState(false);
  const [showValidity, setShowValidity] = useState(false);
  const [copied, setCopied] = useState(false);

  function toggleType(type: string) {
    setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  }

  const loadSavedResearch = useCallback(async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data } = await supabase.from("research_sessions").select("id, query, jurisdiction, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setSavedSessions(data ?? []);
    setLoadingSaved(false);
  }, [user]);

  useEffect(() => {
    loadSavedResearch();
  }, [loadSavedResearch]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError("");
    setLoading(true);
    setResponse(null);
    setActiveSessionId(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/legal-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ query, jurisdiction, source_types: selectedTypes.length > 0 ? selectedTypes : undefined, user_id: user?.id }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Search failed");
      }
      const data: SearchResponse = await res.json();
      setResponse(data);
      if (user) {
        await supabase.from("research_sessions").insert({
          user_id: user.id, query, jurisdiction,
          results: data.sources, ai_analysis: data.ai_analysis,
          ...(linkedCaseId ? { case_id: linkedCaseId } : {}),
        } as never);
        loadSavedResearch();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(sessionId: string) {
    await supabase.from("research_sessions").delete().eq("id", sessionId);
    setSavedSessions(p => p.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setResponse(null);
    }
  }

  async function loadSession(sessionId: string) {
    const { data } = await supabase.from("research_sessions").select("*").eq("id", sessionId).single();
    if (!data) return;
    setQuery(data.query);
    setJurisdiction(data.jurisdiction || "");
    setActiveSessionId(sessionId);
    setResponse({
      sources: data.results ?? [],
      ai_analysis: data.ai_analysis ?? "",
      tavily_results: [],
      sources_count: (data.results ?? []).length,
    });
    setError("");
  }

  async function validateAuthorities() {
    if (!response?.sources.length) return;
    setValidityLoading(true);
    setValidityResult("");
    setShowValidity(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const sourceList = response.sources
        .map((s, i) => `${i + 1}. ${s.source_name}${s.citation ? ` — ${s.citation}` : ""}${s.jurisdiction ? ` (${s.jurisdiction})` : ""}`)
        .join("\n");
      const prompt = `You are a legal citator assistant. For each authority listed below, assess its current validity as good law.

Authorities retrieved:
${sourceList}

For EACH authority, provide:
- **Status**: Good Law ✓ | Caution ⚠ | Overruled/Superseded ✗ | Unable to verify
- **Reason**: One sentence explaining the status (e.g., "Confirmed good law under Ghana ADR Act 2010", "Distinguished in subsequent decisions but not overruled", "Superseded by 2021 UNCITRAL Rules amendment")
- **Note**: Any important limitation on how the authority should be used

Format as a numbered list matching the order above. Be specific about Ghanaian law where applicable. If you cannot verify the status with confidence, say so honestly rather than guessing.`;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], context: "research" }),
      });
      const data = await res.json();
      setValidityResult(data.choices?.[0]?.message?.content ?? "No result returned.");
    } catch {
      setValidityResult("Validity check failed. Please try again.");
    } finally {
      setValidityLoading(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  async function copyAsRichText(markdown: string) {
    try {
      // Create a temporary div to render the markdown
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      // Use ReactMarkdown to render the markdown to HTML
      const { default: ReactMarkdown } = await import("react-markdown");
      const { default: remarkGfm } = await import("remark-gfm");
      const { createRoot } = await import("react-dom/client");
      
      const root = createRoot(tempDiv);
      root.render(
        <div className="prose-doc text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      );

      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const html = tempDiv.innerHTML;
      
      // Clean up
      root.unmount();
      document.body.removeChild(tempDiv);

      // Copy as rich text (HTML)
      const clipboardItem = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([markdown], { type: "text/plain" }),
      });
      await navigator.clipboard.write([clipboardItem]);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy as rich text:", err);
      // Fallback to plain text copy
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const suggestions = [
    "Standard for interim measures in ICC arbitration",
    "Kompetenz-kompetenz principle under UNCITRAL Rules",
    "Enforcement of arbitral awards under Ghana ADR Act 2010",
    "Doctrine of separability in arbitration agreements",
    "Grounds for challenging arbitral awards in common law",
  ];

  return (
    <AppLayout>
      <Header title="Legal Research" subtitle="Semantic search across legal library, case law, and live sources" />
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-navy-950 mb-2">Research Query</label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all resize-none"
                  placeholder="e.g. What are the grounds for challenging an arbitral award under the New York Convention?"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Jurisdiction</label>
                  <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent bg-white">
                    {JURISDICTIONS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Source Types</label>
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_TYPES.map((t) => (
                      <button key={t.value} type="button" onClick={() => toggleType(t.value)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${selectedTypes.includes(t.value) ? "bg-navy-950 text-white border-navy-950" : "bg-white text-slate-600 border-slate-300 hover:border-navy-300"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading || !query.trim()} className="flex items-center gap-2 px-6 py-2 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Researching...</> : <><Search size={15} /> Research</>}
                </button>
              </div>
            </form>
            {!response && !loading && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2.5">Suggested queries</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => setQuery(s)} className="text-xs px-3 py-1.5 bg-slate-50 hover:bg-navy-50 text-slate-600 hover:text-navy-700 border border-slate-200 hover:border-navy-200 rounded-full transition-all">{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />{error}
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Loader2 size={28} className="text-navy-600 animate-spin" />
                  <Sparkles size={12} className="text-gold-500 absolute -top-1 -right-1" />
                </div>
              </div>
              <p className="text-sm font-medium text-navy-900">Searching legal authorities...</p>
              <p className="text-xs text-slate-400 mt-1">Retrieving from legal library, case databases, and live sources</p>
              <div className="flex justify-center gap-6 mt-5">
                {["Legal Library", "Laws.Africa", "CourtListener", "Tavily"].map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy-300 animate-pulse" />
                    <span className="text-xs text-slate-400">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {response && !loading && (
            <div className="space-y-6">
              {response.sources.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-navy-50"><Database size={14} className="text-navy-600" /></div>
                      <div>
                        <h3 className="text-sm font-bold text-navy-950">Retrieved Legal Sources</h3>
                        <p className="text-xs text-slate-500">{response.sources.length} sources retrieved via semantic search</p>
                      </div>
                    </div>
                    <button
                      onClick={validateAuthorities}
                      disabled={validityLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-navy-300 text-navy-700 hover:text-navy-900 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                    >
                      {validityLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      Validate Authorities
                    </button>
                  </div>
                  <div className="space-y-3">
                    {response.sources.map((source, i) => <SourceCard key={source.id} source={source} index={i} />)}
                  </div>

                  {/* Validity check result */}
                  {showValidity && (
                    <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={13} className="text-navy-600" />
                          <span className="text-xs font-semibold text-navy-900">Authority Validity Assessment</span>
                        </div>
                        <button onClick={() => setShowValidity(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                      <div className="p-4">
                        {validityLoading ? (
                          <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                            <Loader2 size={14} className="animate-spin" />Checking validity of {response.sources.length} authorit{response.sources.length !== 1 ? "ies" : "y"}...
                          </div>
                        ) : (
                          <div className="prose-doc text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{validityResult}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {response.ai_analysis && (
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-gold-50"><Sparkles size={14} className="text-gold-600" /></div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-navy-950">CIMA AI Analysis</h3>
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full">
                          <CheckCircle2 size={11} /> Grounded — {response.sources_count} source{response.sources_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => copyAsRichText(response.ai_analysis)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-navy-300 text-navy-700 hover:text-navy-900 rounded-lg text-xs font-medium transition-colors shrink-0"
                      title="Copy as rich text"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="prose-doc text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.ai_analysis}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {response.tavily_results && response.tavily_results.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-1.5 rounded-lg bg-blue-50"><Globe size={14} className="text-blue-600" /></div>
                    <div>
                      <h3 className="text-sm font-bold text-navy-950">Live Web Results</h3>
                      <p className="text-xs text-slate-500">Real-time results from legal sources across the web</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {response.tavily_results.map((r, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-navy-900 hover:text-navy-600 hover:underline line-clamp-1 flex items-center gap-1.5">
                              {r.title}<ExternalLink size={11} className="shrink-0 text-slate-400" />
                            </a>
                            <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{r.url}</p>
                            <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">{r.content}</p>
                          </div>
                          {r.score > 0 && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">{Math.round(r.score * 100)}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar — hidden on mobile */}
        <div className="hidden lg:flex w-64 border-l border-slate-200 bg-white flex-col shrink-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bookmark size={14} className="text-navy-600" />
              <h3 className="text-sm font-semibold text-navy-950">Saved Research</h3>
            </div>
            <button onClick={loadSavedResearch} className="text-xs text-navy-600 hover:text-gold-600 font-medium transition-colors">Load</button>
          </div>
          <div className="overflow-y-auto p-3 space-y-1.5 max-h-48 border-b border-slate-100">
            {loadingSaved ? (
              <div className="flex justify-center py-4"><Loader2 size={16} className="text-slate-400 animate-spin" /></div>
            ) : savedSessions.length === 0 ? (
              <div className="py-5 text-center">
                <FileText size={20} className="text-slate-200 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">No saved research yet</p>
              </div>
            ) : (
              savedSessions.map((s) => (
                <div key={s.id} className={`group relative rounded-lg border transition-all ${activeSessionId === s.id ? "bg-navy-50 border-navy-200" : "hover:bg-slate-50 border-transparent hover:border-slate-200"}`}>
                  <button onClick={() => loadSession(s.id)} className="w-full text-left p-2.5 pr-7">
                    <p className="text-xs font-medium text-navy-900 line-clamp-2 group-hover:text-navy-700">{s.query}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock size={10} className="text-slate-400" />
                      <span className="text-xs text-slate-400">{formatDate(s.created_at)}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
            <Library size={14} className="text-navy-600" />
            <h3 className="text-sm font-semibold text-navy-950">Legal Library</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {LIBRARY_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">{cat.label}</p>
                <div className="space-y-0.5">
                  {cat.items.map((item) => (
                    <button key={item} onClick={() => setQuery(`Key provisions and requirements of ${item}`)} className="w-full flex items-center gap-2 text-xs text-slate-600 hover:text-navy-700 hover:bg-slate-50 px-2 py-1.5 rounded-md transition-all text-left">
                      <Gavel size={10} className="shrink-0 text-gold-500" />{item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Source Layers</p>
            <div className="space-y-1.5">
              {[{ label: "Legal Library", color: "bg-navy-400" }, { label: "Laws.Africa", color: "bg-teal-400" }, { label: "CourtListener", color: "bg-blue-400" }, { label: "Live Web", color: "bg-amber-400" }].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-xs text-slate-500">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
