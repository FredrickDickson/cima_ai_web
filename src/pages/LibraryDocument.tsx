import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Send,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { convex } from "../lib/convexClient";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  CaseBrief,
  CaseCitation,
  CaseCitatorRun,
  CaseTreatment,
  LegalLibraryDocumentChunk,
  LegalLibraryDocumentWithChunks,
} from "../types/database";
import { jurisdictionLabel } from "../lib/jurisdictions";

// Convex camelCase fields renamed to LegalLibraryDocumentWithChunks's
// snake_case shape, so the viewer/panels below need zero source-specific
// branching once this mapping is applied.
function convexDocWithChunksToUnified(result: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chunks: any[];
}): LegalLibraryDocumentWithChunks {
  const doc = result.document;
  return {
    id: doc._id,
    title: doc.title,
    source_type: doc.sourceType,
    jurisdiction: doc.jurisdiction,
    citation: doc.citation ?? "",
    court: doc.court ?? "",
    decided_year: doc.decidedYear ?? null,
    parties: doc.parties ?? [],
    legislation_number: doc.legislationNumber ?? "",
    storage_path: doc.storageId ?? null,
    original_format: doc.originalFormat,
    source_collection: doc.sourceCollection ?? "",
    extracted_char_count: doc.extractedCharCount,
    ingestion_status: doc.ingestionStatus,
    error_message: doc.errorMessage ?? null,
    created_at: new Date(doc.createdAt).toISOString(),
    updated_at: new Date(doc.updatedAt).toISOString(),
    chunks: result.chunks.map((c) => ({
      id: c._id,
      chunk_index: c.chunkIndex,
      title: c.title,
      citation: c.citation ?? "",
      content: c.content,
    })),
  };
}

interface LawsAfricaMatch {
  id: string;
  source_name: string;
  citation: string;
  content: string;
  url?: string;
}

const TREATMENT_STYLES: Record<CaseTreatment, { label: string; className: string }> = {
  followed: { label: "Followed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  applied: { label: "Applied", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  mentioned: { label: "Mentioned", className: "bg-slate-100 text-slate-600 border-slate-200" },
  distinguished: { label: "Distinguished", className: "bg-amber-50 text-amber-700 border-amber-200" },
  disapproved: { label: "Disapproved", className: "bg-red-50 text-red-700 border-red-200" },
  overruled: { label: "Overruled", className: "bg-red-50 text-red-700 border-red-200" },
};

const TREATMENT_GROUP: Record<CaseTreatment, "positive" | "neutral" | "negative"> = {
  followed: "positive",
  applied: "positive",
  mentioned: "neutral",
  distinguished: "negative",
  disapproved: "negative",
  overruled: "negative",
};

async function callFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `${name} request failed (${res.status})`);
  return data as T;
}

// ─── PDF Viewer ───────────────────────────────────────────────────────────

function PdfViewer({ url }: { url: string }) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const pageTextsRef = useRef<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        pageTextsRef.current = [];
        setPageNum(1);
      } catch {
        if (!cancelled) setError("Could not load PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum, scale]);

  async function ensurePageTexts(): Promise<string[]> {
    if (pageTextsRef.current.length === numPages) return pageTextsRef.current;
    const texts: string[] = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      texts.push(content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ").toLowerCase());
    }
    pageTextsRef.current = texts;
    return texts;
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim() || !pdfDoc) return;
    setSearching(true);
    try {
      const texts = await ensurePageTexts();
      const query = q.toLowerCase();
      // Prefer the next match at/after the current page, wrap around otherwise.
      let match = texts.findIndex((t, i) => i + 1 >= pageNum && t.includes(query));
      if (match === -1) match = texts.findIndex((t) => t.includes(query));
      if (match >= 0) setPageNum(match + 1);
    } finally {
      setSearching(false);
    }
  }

  if (error) return <div className="text-center py-16 text-red-500 text-sm">{error}</div>;

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-wrap items-center gap-2 mb-4 sticky top-0 bg-white/95 backdrop-blur py-2 z-10 w-full justify-center">
        <button
          onClick={() => setPageNum((p) => Math.max(1, p - 1))}
          disabled={pageNum <= 1}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-slate-600 w-20 text-center">
          Page {pageNum} / {numPages || "…"}
        </span>
        <button
          onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
          disabled={pageNum >= numPages}
          className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="p-1.5 rounded-lg border border-slate-200">
          <ZoomOut size={16} />
        </button>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="p-1.5 rounded-lg border border-slate-200">
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search in document..."
            className="pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-400 w-40"
          />
          {searching && <Loader2 size={12} className="animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading PDF...
        </div>
      ) : (
        <canvas ref={canvasRef} className="border border-slate-200 shadow-sm max-w-full h-auto" />
      )}
    </div>
  );
}

// ─── DOCX Viewer ──────────────────────────────────────────────────────────

function DocxViewer({ url }: { url: string }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const mammoth = await import("mammoth");
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const result = await mammoth.default.convertToHtml({ arrayBuffer: buf });
        if (!cancelled) setHtml(result.value);
      } catch {
        if (!cancelled) setError("Could not load document.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading document...
      </div>
    );
  }
  if (error) return <div className="text-center py-16 text-red-500 text-sm">{error}</div>;

  return (
    <div
      className="prose prose-sm max-w-none text-navy-950"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: 1.75 }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

// ─── Text Chunk Reader (htm-sourced documents) ───────────────────────────

function TextChunkViewer({ chunks }: { chunks: LegalLibraryDocumentChunk[] }) {
  return (
    <div className="flex gap-6">
      {chunks.length > 3 && (
        <div className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-4 space-y-1 text-xs max-h-[70vh] overflow-y-auto pr-2">
            {chunks.map((c, i) => (
              <a
                key={c.id}
                href={`#chunk-${i}`}
                className="block text-slate-500 hover:text-gold-600 truncate py-0.5"
                title={c.title}
              >
                {c.title}
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 space-y-6 min-w-0">
        {chunks.map((c, i) => (
          <section key={c.id} id={`chunk-${i}`} className="scroll-mt-20">
            <p
              className="whitespace-pre-wrap text-sm text-navy-950"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: 1.75 }}
            >
              {c.content}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

// ─── AI Chat Panel ────────────────────────────────────────────────────────

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function DocumentChat({ docId, docTitle }: { docId: string; docTitle: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: next, context: "research", library_doc_id: docId }),
      });
      if (!res.ok) throw new Error(`AI request failed (${res.status})`);
      const data = await res.json();
      const content = data.content ?? data.choices?.[0]?.message?.content ?? "";
      setMessages((prev) => [...prev, { role: "assistant", content: content || "No response." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Bot size={16} className="text-gold-500" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-950">Ask about this document</p>
          <p className="text-xs text-slate-500 truncate">{docTitle}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400">
            Ask a question — e.g. "Summarise this case" or "What did the court decide?". Answers are grounded only in
            this document.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg px-3 py-2 ${
              m.role === "user" ? "bg-navy-950 text-white ml-6" : "bg-slate-100 text-navy-950 mr-6"
            }`}
          >
            {m.role === "assistant" ? (
              <div className="prose prose-sm max-w-none prose-p:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mr-6">
            <Loader2 size={13} className="animate-spin" /> Thinking...
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-slate-200 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="p-2 rounded-lg bg-navy-950 text-white disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Case Brief Panel ─────────────────────────────────────────────────────

function CaseBriefPanel({ docId }: { docId: string }) {
  const [brief, setBrief] = useState<CaseBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  async function load(forceRegenerate = false) {
    forceRegenerate ? setRegenerating(true) : setLoading(true);
    setError("");
    try {
      const data = await callFn<{ brief: CaseBrief }>("case-brief", {
        doc_id: docId,
        force_regenerate: forceRegenerate,
      });
      setBrief(data.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a case brief.");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <FileText size={16} className="text-gold-500" />
        <p className="text-sm font-semibold text-navy-950">AI Case Brief</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Generating brief...
          </div>
        ) : error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : brief?.parse_status === "failed" ? (
          <p className="text-xs text-amber-600">
            Could not generate a structured brief for this case. Try regenerating.
          </p>
        ) : brief ? (
          <>
            {brief.parse_status === "partial" && (
              <p className="text-xs text-amber-600">Some sections may be incomplete.</p>
            )}
            {brief.area_of_law && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gold-50 text-gold-700 border border-gold-200">
                {brief.area_of_law}
              </span>
            )}
            <BriefSection label="Facts" body={brief.facts} />
            <BriefListSection label="Issues" items={brief.issues} />
            <BriefSection label="Holding" body={brief.holding} />
            <BriefSection label="Procedural History" body={brief.procedural_history} />
            <BriefListSection label="Principles Established" items={brief.principles} />
            {brief.concurrences_dissents.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-1.5">Concurrences &amp; Dissents</p>
                <div className="space-y-2">
                  {brief.concurrences_dissents.map((cd, i) => (
                    <p key={i} className="text-sm text-navy-950">
                      <span className="font-medium">
                        {cd.judge} ({cd.type}):
                      </span>{" "}
                      {cd.summary}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
      {brief && !loading && (
        <div className="p-3 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-400">Generated {new Date(brief.generated_at).toLocaleDateString()}</p>
          <button
            onClick={() => load(true)}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-950 disabled:opacity-50"
          >
            {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

function BriefSection({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500 mb-1.5">{label}</p>
      <p className="text-sm text-navy-950 whitespace-pre-wrap leading-relaxed">{body || "Not stated."}</p>
    </div>
  );
}

function BriefListSection({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return <BriefSection label={label} body="" />;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500 mb-1.5">{label}</p>
      <ul className="list-disc list-inside space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-navy-950 leading-relaxed">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Case Citator Panel ───────────────────────────────────────────────────

type TreatmentFilter = "all" | "positive" | "neutral" | "negative";

function CaseCitatorPanel({ docId }: { docId: string }) {
  const [run, setRun] = useState<CaseCitatorRun | null>(null);
  const [citations, setCitations] = useState<CaseCitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TreatmentFilter>("all");

  async function load(forceRefresh = false) {
    forceRefresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const data = await callFn<{ run: CaseCitatorRun; citations: CaseCitation[] }>("case-citator", {
        doc_id: docId,
        force_refresh: forceRefresh,
      });
      setRun(data.run);
      setCitations(data.citations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze citations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const filtered = citations.filter((c) => filter === "all" || TREATMENT_GROUP[c.treatment] === filter);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <GitBranch size={16} className="text-gold-500" />
        <p className="text-sm font-semibold text-navy-950">Smart Citator</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm text-center">
            <Loader2 size={16} className="animate-spin mr-2" /> Analyzing citations across the library...
          </div>
        ) : error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : (
          <>
            {run && (
              <p className="text-xs text-slate-400">
                Checked against {run.corpus_doc_count} case documents in the library on{" "}
                {new Date(run.created_at).toLocaleDateString()}.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(["all", "positive", "neutral", "negative"] as TreatmentFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-colors ${
                    filter === f
                      ? "bg-navy-950 text-white border-navy-950"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 pt-2">
                {citations.length === 0
                  ? "No later case in the library discusses this decision. This does not confirm the case remains good law — it means no citing case has been ingested yet that references it."
                  : "No citations match this filter."}
              </p>
            ) : (
              <div className="space-y-3 pt-1">
                {filtered.map((c) => {
                  const style = TREATMENT_STYLES[c.treatment];
                  return (
                    <div key={c.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <a
                          href={`/library/${c.citing_doc_id}`}
                          className="text-sm font-medium text-navy-950 hover:text-gold-600 truncate"
                        >
                          Citing case
                        </a>
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${style.className}`}>
                          {style.label}
                          {c.confidence === "low" ? " · low confidence" : ""}
                        </span>
                      </div>
                      {c.context_snippet && (
                        <p className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-2 mb-1">
                          "{c.context_snippet}"
                        </p>
                      )}
                      {c.reasoning && <p className="text-xs text-slate-400">{c.reasoning}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-950 disabled:opacity-50"
        >
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh analysis
        </button>
      </div>
    </div>
  );
}

// ─── Legislation Currency Check Panel ─────────────────────────────────────

function CurrencyCheckPanel({ docId }: { docId: string }) {
  const [matches, setMatches] = useState<LawsAfricaMatch[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check() {
    setLoading(true);
    setError("");
    try {
      const data = await callFn<{ matches: LawsAfricaMatch[]; checked_at: string }>(
        "legislation-currency-check",
        { doc_id: docId },
      );
      setMatches(data.matches);
      setCheckedAt(data.checked_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check Laws.Africa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <RefreshCw size={16} className="text-gold-500" />
        <p className="text-sm font-semibold text-navy-950">Legislation Currency Check</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <p className="text-xs text-slate-500">
          This shows Laws.Africa's current published text for comparison. It does not automatically diff this
          against the version in our library — please review both manually.
        </p>
        {matches === null ? (
          <button
            onClick={check}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-navy-950 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Check Laws.Africa for the current version
          </button>
        ) : (
          <>
            {checkedAt && <p className="text-xs text-slate-400">Checked {new Date(checkedAt).toLocaleString()}</p>}
            {matches.length === 0 ? (
              <p className="text-xs text-slate-400">
                No matching legislation found on Laws.Africa. This may be a very old instrument, a subsidiary
                regulation not in their database, or the title/number may not match exactly.
              </p>
            ) : (
              <div className="space-y-2">
                {matches.map((m) => (
                  <div key={m.id} className="border border-slate-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-navy-950">{m.source_name}</p>
                    {m.citation && <p className="text-xs text-slate-500">{m.citation}</p>}
                    {m.content && <p className="text-xs text-slate-500 mt-1 line-clamp-3">{m.content}</p>}
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-gold-600 mt-2"
                      >
                        View on Laws.Africa <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={check} disabled={loading} className="text-xs font-medium text-navy-700 hover:text-navy-950 disabled:opacity-50">
              {loading ? "Checking..." : "Check again"}
            </button>
          </>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function LibraryDocument() {
  const { docId, source: sourceParam } = useParams<{ docId: string; source?: string }>();
  // The single-param route (/library/:docId) predates the Convex migration
  // and always pointed at Supabase — default there when no source segment is
  // present, rather than force-migrating every existing link site.
  const source: "supabase" | "convex" = sourceParam === "convex" ? "convex" : "supabase";
  const navigate = useNavigate();
  const [doc, setDoc] = useState<LegalLibraryDocumentWithChunks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"chat" | "brief" | "citator" | "currency" | null>(null);

  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    setError("");
    setActivePanel(null);
    (async () => {
      if (source === "convex") {
        const result = await convex.query(api.libraryDocuments.getWithChunks, {
          docId: docId as Id<"libraryDocuments">,
        });
        if (!result) {
          setError("Document not found.");
          setLoading(false);
          return;
        }
        const row = convexDocWithChunksToUnified(result);
        setDoc(row);
        if (result.document.storageId) {
          const url = await convex.query(api.libraryDocuments.getFileUrl, {
            storageId: result.document.storageId,
          });
          setFileUrl(url);
        }
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await (supabase.rpc as any)("get_legal_library_document", { doc_id: docId });
      const row = (Array.isArray(data) ? data[0] : data) as unknown as LegalLibraryDocumentWithChunks | undefined;
      if (rpcError || !row) {
        setError("Document not found.");
        setLoading(false);
        return;
      }
      setDoc(row);

      if (row.storage_path) {
        const { data: signed } = await supabase.storage
          .from("legal-documents")
          .createSignedUrl(row.storage_path, 3600);
        setFileUrl(signed?.signedUrl ?? null);
      }
      setLoading(false);
    })();
  }, [docId, source]);

  const title =
    doc?.parties?.length === 2 ? `${doc.parties[0].name} v. ${doc.parties[1].name}` : doc?.title ?? "";

  return (
    <AppLayout>
      <Header title={loading ? "Loading..." : title || "Document"} subtitle="Legal Library" />
      <div className="flex-1 overflow-hidden flex flex-col h-full">
        <div className="px-4 md:px-8 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/library")}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-navy-950"
          >
            <ArrowLeft size={15} /> Back to Library
          </button>
          <div className="flex items-center gap-2">
            {/* {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Download size={13} /> Original
              </a>
            )} */}
            {doc?.source_type === "case" && (
              <button
                onClick={() => source === "supabase" && setActivePanel((p) => (p === "brief" ? null : "brief"))}
                disabled={source === "convex"}
                title={source === "convex" ? "AI case tools are only available for documents in the main library today" : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  source === "convex"
                    ? "text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed"
                    : activePanel === "brief"
                      ? "bg-navy-950 text-white"
                      : "text-navy-700 border border-navy-200 bg-navy-50 hover:bg-navy-100"
                }`}
              >
                {activePanel === "brief" && source === "supabase" ? <X size={13} /> : <FileText size={13} />}
                {activePanel === "brief" && source === "supabase" ? "Close" : "Case Brief"}
              </button>
            )}
            {doc?.source_type === "case" && (
              <button
                onClick={() => source === "supabase" && setActivePanel((p) => (p === "citator" ? null : "citator"))}
                disabled={source === "convex"}
                title={source === "convex" ? "AI case tools are only available for documents in the main library today" : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  source === "convex"
                    ? "text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed"
                    : activePanel === "citator"
                      ? "bg-navy-950 text-white"
                      : "text-navy-700 border border-navy-200 bg-navy-50 hover:bg-navy-100"
                }`}
              >
                {activePanel === "citator" && source === "supabase" ? <X size={13} /> : <GitBranch size={13} />}
                {activePanel === "citator" && source === "supabase" ? "Close" : "Citator"}
              </button>
            )}
            {doc?.source_type === "statute" && (
              <button
                onClick={() => source === "supabase" && setActivePanel((p) => (p === "currency" ? null : "currency"))}
                disabled={source === "convex"}
                title={source === "convex" ? "AI case tools are only available for documents in the main library today" : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  source === "convex"
                    ? "text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed"
                    : activePanel === "currency"
                      ? "bg-navy-950 text-white"
                      : "text-navy-700 border border-navy-200 bg-navy-50 hover:bg-navy-100"
                }`}
              >
                {activePanel === "currency" && source === "supabase" ? <X size={13} /> : <RefreshCw size={13} />}
                {activePanel === "currency" && source === "supabase" ? "Close" : "Check Currency"}
              </button>
            )}
            <button
              onClick={() => source === "supabase" && setActivePanel((p) => (p === "chat" ? null : "chat"))}
              disabled={source === "convex"}
              title={source === "convex" ? "AI case tools are only available for documents in the main library today" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                source === "convex"
                  ? "text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed"
                  : activePanel === "chat"
                    ? "bg-navy-950 text-white"
                    : "text-gold-700 border border-gold-300 bg-gold-50 hover:bg-gold-100"
              }`}
            >
              {activePanel === "chat" && source === "supabase" ? <X size={13} /> : <Bot size={13} />}
              {activePanel === "chat" && source === "supabase" ? "Close chat" : "Ask CIMA AI"}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 size={22} className="animate-spin mr-2" /> Loading document...
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-500 text-sm">{error}</div>
            ) : !doc ? null : (
              <div className="max-w-3xl mx-auto">
                <div className="mb-6 pb-4 border-b border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">
                    {jurisdictionLabel(doc.jurisdiction)}
                    {" · "}
                    {doc.source_type === "case" ? doc.court : "Legislation"}
                    {doc.decided_year ? ` · ${doc.decided_year}` : ""}
                    {doc.citation ? ` · ${doc.citation}` : ""}
                    {doc.legislation_number ? ` · ${doc.legislation_number}` : ""}
                  </p>
                  <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
                </div>

                {doc.original_format === "pdf" && fileUrl ? (
                  <PdfViewer url={fileUrl} />
                ) : doc.original_format === "docx" && fileUrl ? (
                  <DocxViewer url={fileUrl} />
                ) : (
                  <TextChunkViewer chunks={doc.chunks} />
                )}
              </div>
            )}
          </div>

          {activePanel && doc && (
            <div className="w-full max-w-sm border-l border-slate-200 bg-white shrink-0 overflow-hidden">
              {activePanel === "chat" && <DocumentChat docId={doc.id} docTitle={title} />}
              {activePanel === "brief" && <CaseBriefPanel docId={doc.id} />}
              {activePanel === "citator" && <CaseCitatorPanel docId={doc.id} />}
              {activePanel === "currency" && <CurrencyCheckPanel docId={doc.id} />}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
