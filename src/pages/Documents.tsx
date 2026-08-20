import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  File,
  FileText,
  Filter,
  Folder,
  GitCompare,
  Loader2,
  Pencil,
  Plus,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { logCaseEvent } from "../lib/caseEvents";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import type { DbDocument as DocType, DbDocumentFolder } from "../types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "all"
  | "recent"
  | "case_linked"
  | "folder"
  | "contract"
  | "brief"
  | "award"
  | "evidence"
  | "statute"
  | "document";

interface UploadFormState {
  name: string;
  type: string;
  caseId: string;
}

interface CaseSummary {
  id: string;
  title: string;
  matter_number: string;
}

interface DocumentMetadata {
  document_type?: string;
  parties?: string[];
  key_provisions?: string[];
  dates?: { date: string; event: string }[];
  issues_identified?: string[];
  risk_summary?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UPLOAD_TYPE_OPTIONS = [
  { value: "document", label: "General Document" },
  { value: "brief", label: "Brief / Pleading" },
  { value: "contract", label: "Contract / Agreement" },
  { value: "award", label: "Award / Judgment" },
  { value: "evidence", label: "Evidence / Exhibit" },
  { value: "statute", label: "Statute / Regulation" },
];

const SMART_COLLECTIONS: { key: Section; label: string }[] = [
  { key: "contract", label: "Contracts" },
  { key: "brief", label: "Briefs & Pleadings" },
  { key: "award", label: "Awards & Judgments" },
  { key: "evidence", label: "Evidence" },
  { key: "statute", label: "Statutes & Regulations" },
  { key: "document", label: "General Documents" },
];

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function statusIcon(status: string) {
  if (status === "ready") return <CheckCircle size={13} className="text-emerald-500" />;
  if (status === "processing" || status === "extracting") return <Loader2 size={13} className="text-amber-500 animate-spin" />;
  if (status === "error") return <AlertCircle size={13} className="text-red-500" />;
  return <Clock size={13} className="text-slate-400" />;
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    contract: "bg-blue-100 text-blue-700",
    brief: "bg-violet-100 text-violet-700",
    award: "bg-amber-100 text-amber-700",
    evidence: "bg-orange-100 text-orange-700",
    statute: "bg-teal-100 text-teal-700",
    document: "bg-slate-100 text-slate-600",
  };
  return map[type] ?? "bg-slate-100 text-slate-600";
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function riskColor(score: number): string {
  if (score >= 70) return "text-red-600 bg-red-50";
  if (score >= 40) return "text-amber-600 bg-amber-50";
  return "text-emerald-600 bg-emerald-50";
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-gold-100 text-navy-950 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function Documents() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [folders, setFolders] = useState<DbDocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filter / Navigation ───────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<Section>("all");
  const [filterCaseId, setFilterCaseId] = useState<string | null>(null);
  const [filterFolderId, setFilterFolderId] = useState<string | null>(null);
  const [caseFilterExpanded, setCaseFilterExpanded] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // ── Folders ───────────────────────────────────────────────────────────────
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  // ── Search ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [semanticResults, setSemanticResults] = useState<string[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [keywordResults, setKeywordResults] = useState<string[]>([]);

  // Google-style suggestions dropdown
  const [suggestions, setSuggestions] = useState<DocType[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  // ── Multi-select & Compare ────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [compareResult, setCompareResult] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);

  // ── Viewer ────────────────────────────────────────────────────────────────
  const [viewerDoc, setViewerDoc] = useState<DocType | null>(null);
  const [viewerSearch, setViewerSearch] = useState("");
  const [showOriginalDoc, setShowOriginalDoc] = useState(false);
  const [aiTab, setAiTab] = useState<"summary" | "analysis" | "timeline">("summary");

  // ── AI Action Results ─────────────────────────────────────────────────────
  const [issuesResult, setIssuesResult] = useState("");
  const [obligationsResult, setObligationsResult] = useState("");
  const [timelineResult, setTimelineResult] = useState("");
  const [briefResult, setBriefResult] = useState("");
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);

  // ── Upload ────────────────────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    name: "",
    type: "document",
    caseId: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Case linking ──────────────────────────────────────────────────────────
  const [linkingCase, setLinkingCase] = useState(false);
  const [linkingFolder, setLinkingFolder] = useState(false);

  // ── Semantic debounce timer & abort controller ────────────────────────────
  const semanticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const semanticAbort = useRef<AbortController | null>(null);
  const keywordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keywordRequestId = useRef(0);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionRequestId = useRef(0);

  // ─── AI Helper ─────────────────────────────────────────────────────────────

  async function callAiChat(
    messages: { role: string; content: string }[],
    context = "analysis"
  ): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages, context }),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status})${errText ? `: ${errText}` : ""}`);
    }
    const data = await res.json();
    const content = data.content;
    if (!content) throw new Error("AI returned an empty response. Please try again.");
    return content;
  }

  // ─── Data Loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("documents" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("cases")
        .select("id, title, matter_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("document_folders" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]).then(([{ data: docs }, { data: casesData }, { data: foldersData }]) => {
      setDocuments(docs ?? []);
      setCases((casesData ?? []) as CaseSummary[]);
      setFolders((foldersData ?? []) as DbDocumentFolder[]);
      setLoading(false);
    });
  }, [user]);

  // ─── Computed Values ────────────────────────────────────────────────────────

  const counts = useMemo<Record<string, number>>(() => {
    const byType: Record<string, number> = {};
    const byFolder: Record<string, number> = {};
    for (const doc of documents) {
      byType[doc.type] = (byType[doc.type] ?? 0) + 1;
      if (doc.folder_id) byFolder[doc.folder_id] = (byFolder[doc.folder_id] ?? 0) + 1;
    }
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      ...byType,
      ...byFolder,
      all: documents.length,
      recent: documents.filter(
        (d) => new Date(d.created_at).getTime() > sevenDaysAgo
      ).length,
      case_linked: documents.filter((d) => d.case_id).length,
    };
  }, [documents]);

  const casesWithDocs = useMemo(() => {
    const ids = new Set(documents.filter((d) => d.case_id).map((d) => d.case_id));
    return cases.filter((c) => ids.has(c.id));
  }, [documents, cases]);

  const filteredDocs = useMemo(() => {
    let base = [...documents];

    if (activeSection === "recent") {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      base = base.filter((d) => new Date(d.created_at).getTime() > cutoff);
    } else if (activeSection === "case_linked") {
      base = base.filter((d) =>
        filterCaseId ? d.case_id === filterCaseId : !!d.case_id
      );
    } else if (activeSection === "folder") {
      base = base.filter((d) =>
        filterFolderId ? d.folder_id === filterFolderId : !!d.folder_id
      );
    } else if (activeSection !== "all") {
      base = base.filter((d) => d.type === activeSection);
    }

    if (search.trim()) {
      if (searchMode === "semantic" && semanticResults.length > 0) {
        const idSet = new Set(semanticResults);
        base = base
          .filter((d) => idSet.has(d.id))
          .sort(
            (a, b) =>
              semanticResults.indexOf(a.id) - semanticResults.indexOf(b.id)
          );
      } else if (searchMode === "keyword" && keywordResults.length > 0) {
        const idSet = new Set(keywordResults);
        base = base
          .filter((d) => idSet.has(d.id))
          .sort(
            (a, b) =>
              keywordResults.indexOf(a.id) - keywordResults.indexOf(b.id)
          );
      } else {
        // Fallback while the debounced FTS request is still in flight (or failed) —
        // keeps the list non-empty rather than flashing blank on every keystroke.
        const q = search.toLowerCase();
        base = base.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            (d.ai_summary ?? "").toLowerCase().includes(q) ||
            (d.extracted_text ?? "").slice(0, 500).toLowerCase().includes(q)
        );
      }
    }

    return base;
  }, [documents, activeSection, filterCaseId, filterFolderId, search, searchMode, semanticResults, keywordResults]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError("");
    setUploading(true);

    try {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setUploadError("Please select a file");
        setUploading(false);
        return;
      }

      const docName = uploadForm.name.trim() || file.name;

      let storagePath: string | null = null;
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
      const candidatePath = `${user!.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: storageErr } = await supabase.storage
        .from("documents")
        .upload(candidatePath, file, { contentType: file.type || undefined });
      if (storageErr) {
        console.error("Failed to store original file:", storageErr.message);
      } else {
        storagePath = candidatePath;
      }

      // Row is created before text is extracted (below) — extraction can
      // involve slow client-side OCR for scanned PDFs (see fileUtils.ts),
      // and @mention authority tagging (search_documents) matches on `name`
      // as well as `extracted_text`, so the document is taggable as soon as
      // this row exists rather than only after OCR finishes.
      const payload: any = {
        user_id: user!.id,
        case_id: uploadForm.caseId || null,
        name: docName,
        type: uploadForm.type as DocType["type"],
        file_path: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || "text/plain",
        status: "extracting",
        extracted_text: "",
        ai_summary: "",
        risk_score: 0,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("documents")
        .insert(payload)
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (inserted?.case_id) {
        logCaseEvent(inserted.case_id, user!.id, "document_uploaded", `Document uploaded: "${docName}"`);
      }

      setShowUpload(false);
      setUploadForm({ name: "", type: "document", caseId: "" });
      setSelectedFileName("");
      if (fileRef.current) fileRef.current.value = "";
      setDocuments((prev) => [inserted, ...prev]);

      // Only PDFs can hit the slow OCR fallback in extractTextFromFile
      // (DOCX/TXT extraction is always fast) — let the user know upfront
      // rather than leaving them wondering why the document isn't taggable
      // yet. search_documents excludes status "extracting" (see migration
      // 20260804000001), so @mention won't surface it until this finishes.
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        showToast(
          `Extracting text from "${docName}" — this can take a few minutes for scanned documents. You'll be able to tag it once ready.`,
          "info",
        );
      }

      // Fire-and-forget: extract text (incl. possible OCR), then embed.
      // Neither step blocks the upload UI, but the document only becomes
      // @mention-taggable once extraction lands (see the migration above).
      (async () => {
        try {
          const { extractTextFromFile } = await import("../lib/fileUtils");
          const { text: textContent, truncated, extractedPages, totalPages } = await extractTextFromFile(file);

          if (!textContent.trim()) {
            await supabase.from("documents").update({ status: "error" }).eq("id", inserted.id);
            setDocuments((prev) =>
              prev.map((d) => (d.id === inserted.id ? { ...d, status: "error" as DocType["status"] } : d))
            );
            return;
          }

          const { data: withText } = await supabase
            .from("documents")
            .update({ extracted_text: textContent, status: "processing" })
            .eq("id", inserted.id)
            .select()
            .single();
          if (withText) {
            setDocuments((prev) => prev.map((d) => (d.id === inserted.id ? withText : d)));
          }
          if (truncated) {
            showToast(
              `${docName} — extracted ${extractedPages} of ${totalPages} pages (some pages could not be processed)`,
              "info",
            );
          } else {
            showToast(`${docName} — text fully extracted (${totalPages} page${totalPages === 1 ? "" : "s"})`);
          }

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
          const {
            data: { session },
          } = await supabase.auth.getSession();

          fetch(`${supabaseUrl}/functions/v1/embed-document`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              document_id: inserted.id,
              text_content: textContent,
              user_id: user!.id,
            }),
          })
            .then(async (res) => {
              if (res.ok) {
                const { data: updated } = await supabase
                  .from("documents")
                  .select("*")
                  .eq("id", inserted.id)
                  .single();
                if (updated) {
                  setDocuments((prev) =>
                    prev.map((d) => (d.id === inserted.id ? updated : d))
                  );
                }
              } else {
                setDocuments((prev) =>
                  prev.map((d) =>
                    d.id === inserted.id
                      ? { ...d, status: "error" as DocType["status"] }
                      : d
                  )
                );
              }
            })
            .catch(() => {
              setDocuments((prev) =>
                prev.map((d) =>
                  d.id === inserted.id
                    ? { ...d, status: "error" as DocType["status"] }
                    : d
                )
              );
            });
        } catch (extractErr) {
          console.error("Text extraction failed:", extractErr);
          await supabase.from("documents").update({ status: "error" }).eq("id", inserted.id);
          setDocuments((prev) =>
            prev.map((d) => (d.id === inserted.id ? { ...d, status: "error" as DocType["status"] } : d))
          );
        }
      })();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: DocType) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      showToast(`Failed to delete "${doc.name}": ${error.message}`, "error");
      return;
    }
    if (doc.storage_path) {
      const { error: storageError } = await supabase.storage.from("documents").remove([doc.storage_path]);
      if (storageError) console.error("Failed to remove stored file:", storageError);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    if (viewerDoc?.id === doc.id) setViewerDoc(null);
    showToast(`"${doc.name}" deleted`);
  }

  async function handleLinkCase(docId: string, caseId: string | null) {
    setLinkingCase(true);
    const payload: any = { case_id: caseId, updated_at: new Date().toISOString() };
    await supabase
      .from("documents")
      .update(payload)
      .eq("id", docId);
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, case_id: caseId } : d))
    );
    setViewerDoc((prev) =>
      prev?.id === docId ? { ...prev, case_id: caseId } : prev
    );
    setLinkingCase(false);
  }

  async function handleLinkFolder(docId: string, folderId: string | null) {
    setLinkingFolder(true);
    const payload: any = { folder_id: folderId, updated_at: new Date().toISOString() };
    await supabase
      .from("documents")
      .update(payload)
      .eq("id", docId);
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, folder_id: folderId } : d))
    );
    setViewerDoc((prev) =>
      prev?.id === docId ? { ...prev, folder_id: folderId } : prev
    );
    setLinkingFolder(false);
  }

  async function handleCreateFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    const { data, error } = await supabase
      .from("document_folders" as any)
      .insert({ user_id: user.id, name: trimmed })
      .select()
      .single();
    if (!error && data) {
      setFolders((prev) => [...prev, data as DbDocumentFolder]);
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await supabase.from("document_folders" as any).update({ name: trimmed }).eq("id", id);
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
  }

  async function handleDeleteFolder(id: string, name: string) {
    if (!confirm(`Delete folder "${name}"? Documents inside it will be unfiled, not deleted.`)) return;
    const { error } = await supabase.from("document_folders" as any).delete().eq("id", id);
    if (error) {
      showToast(`Failed to delete "${name}": ${error.message}`, "error");
      return;
    }
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setDocuments((prev) =>
      prev.map((d) => (d.folder_id === id ? { ...d, folder_id: null } : d))
    );
    setViewerDoc((prev) =>
      prev?.folder_id === id ? { ...prev, folder_id: null } : prev
    );
    if (filterFolderId === id) {
      setActiveSection("all");
      setFilterFolderId(null);
    }
    showToast(`Folder "${name}" deleted`);
  }

  function toggleSelectId(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  }

  function openViewer(doc: DocType) {
    setViewerDoc(doc);
    setViewerSearch("");
    setAiTab("summary");
    setIssuesResult("");
    setObligationsResult("");
    setTimelineResult("");
    setBriefResult("");
  }

  // ─── AI Actions ─────────────────────────────────────────────────────────────

  async function handleSummarize() {
    if (!viewerDoc) return;
    setAiActionLoading("summarize");
    try {
      const result = await callAiChat([
        {
          role: "user",
          content: `Provide a concise executive summary of this legal document.
Document name: ${viewerDoc.name}
Document type: ${viewerDoc.type}

Document text:
${viewerDoc.extracted_text?.slice(0, 60000) ?? "[No text available]"}

Return 2-3 paragraphs covering: (1) what this document is and its purpose, (2) the key obligations or provisions, (3) any notable risks or issues.`,
        },
      ]);
      const payload: any = { ai_summary: result, updated_at: new Date().toISOString() };
      await supabase
        .from("documents")
        .update(payload)
        .eq("id", viewerDoc.id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === viewerDoc.id ? { ...d, ai_summary: result } : d))
      );
      setViewerDoc((prev) => (prev ? { ...prev, ai_summary: result } : prev));
    } catch {
      // ignore
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleExtractIssues() {
    if (!viewerDoc) return;
    setAiActionLoading("issues");
    try {
      const result = await callAiChat([
        {
          role: "user",
          content: `You are a legal analyst. Extract the key legal issues from this document.
Document: "${viewerDoc.name}" (${viewerDoc.type})

Text:
${viewerDoc.extracted_text?.slice(0, 60000) ?? "[No text available]"}

Return a numbered list of legal issues. For each: **bold issue title**, then one sentence describing the issue and which party it affects. Return only the list, no preamble.`,
        },
      ]);
      setIssuesResult(result);
    } catch {
      setIssuesResult("Failed to extract issues. Please try again.");
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleExtractObligations() {
    if (!viewerDoc) return;
    setAiActionLoading("obligations");
    try {
      const result = await callAiChat([
        {
          role: "user",
          content: `You are a legal analyst. Extract all legal obligations from this document.
Document: "${viewerDoc.name}" (${viewerDoc.type})

Text:
${viewerDoc.extracted_text?.slice(0, 60000) ?? "[No text available]"}

Return a structured list grouped by party. For each obligation:
**[Party]**: obligation description, and any deadline or condition.
Return only the list, no preamble.`,
        },
      ]);
      setObligationsResult(result);
    } catch {
      setObligationsResult("Failed to extract obligations. Please try again.");
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleCreateTimeline() {
    if (!viewerDoc) return;
    setAiActionLoading("timeline");
    try {
      const result = await callAiChat([
        {
          role: "user",
          content: `You are a legal analyst. Extract all dates and events from this document to create a chronological timeline.
Document: "${viewerDoc.name}"

Text:
${viewerDoc.extracted_text?.slice(0, 60000) ?? "[No text available]"}

Return a chronological list in this exact format:
**[Date]** — [Event description]

Order from earliest to latest. If no date is specified, use "Date unknown".`,
        },
      ]);
      setTimelineResult(result);
    } catch {
      setTimelineResult("Failed to create timeline. Please try again.");
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleGenerateBrief() {
    if (!viewerDoc) return;
    setAiActionLoading("brief");
    try {
      const result = await callAiChat(
        [
          {
            role: "user",
            content: `Draft a legal brief based on the following document.
Source document: "${viewerDoc.name}" (${viewerDoc.type})

Document content:
${viewerDoc.extracted_text?.slice(0, 50000) ?? "[No text available]"}

Generate a professionally structured legal brief that:
1. States the factual background
2. Identifies the key legal issues
3. Presents legal arguments with authority references
4. Concludes with the recommended position

Use formal legal language appropriate for court or tribunal submission.`,
          },
        ],
        "drafting"
      );
      setBriefResult(result);
      setShowBriefModal(true);
    } catch {
      setBriefResult("Failed to generate brief. Please try again.");
      setShowBriefModal(true);
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleCompare() {
    const docIds = Array.from(selectedIds);
    const docA = documents.find((d) => d.id === docIds[0]);
    const docB = documents.find((d) => d.id === docIds[1]);

    if (!docA || !docB) {
      setUploadError("One or both selected documents could not be found. Please reselect and try again.");
      return;
    }

    setCompareLoading(true);
    setCompareResult("");
    setShowCompare(true);

    try {
      const result = await callAiChat([
        {
          role: "user",
          content: `You are an expert legal analyst. Compare these two legal documents:

DOCUMENT A: "${docA.name}" (${docA.type})
${docA.extracted_text?.slice(0, 25000) ?? "[No text available]"}

---

DOCUMENT B: "${docB.name}" (${docB.type})
${docB.extracted_text?.slice(0, 25000) ?? "[No text available]"}

---

Provide a structured comparison covering:
1. **Document Overview** — What each document is and its purpose
2. **Key Similarities** — Common positions, facts, or provisions
3. **Key Differences** — Contradictions, inconsistencies, or divergent positions
4. **Missing Information** — What Document A has that B lacks and vice versa
5. **Legal Implications** — What these differences mean for any related legal matter
6. **Recommendations** — How to reconcile or use these documents together`,
        },
      ]);
      setCompareResult(result);
    } catch {
      setCompareResult("Comparison failed. Please try again.");
    } finally {
      setCompareLoading(false);
    }
  }

  async function handleSemanticSearch(query: string) {
    if (!query.trim() || !user) {
      setSemanticResults([]);
      return;
    }
    // Cancel any in-flight request before starting a new one
    semanticAbort.current?.abort();
    semanticAbort.current = new AbortController();
    const signal = semanticAbort.current.signal;

    setSemanticLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ query, user_id: user.id }),
          signal,
        }
      );
      if (res.ok) {
        const data = await res.json();
        const sources: { title?: string; source_name?: string }[] =
          data.sources ?? [];
        const nameToId = new Map(documents.map((d) => [d.name.toLowerCase(), d.id]));
        const matched: string[] = [];
        for (const src of sources) {
          const srcName = (src.title ?? src.source_name ?? "").toLowerCase();
          if (!srcName) continue;
          if (nameToId.has(srcName)) {
            const id = nameToId.get(srcName)!;
            if (!matched.includes(id)) matched.push(id);
          } else {
            for (const [docName, docId] of nameToId) {
              if (
                docName.includes(srcName) ||
                srcName.includes(docName.slice(0, 20))
              ) {
                if (!matched.includes(docId)) matched.push(docId);
              }
            }
          }
        }
        setSemanticResults(matched);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setSemanticResults([]);
    } finally {
      setSemanticLoading(false);
    }
  }

  async function runKeywordSearch(query: string) {
    if (!query.trim()) {
      setKeywordResults([]);
      return;
    }
    const requestId = ++keywordRequestId.current;
    const { data } = await supabase.rpc("search_documents" as any, {
      search_query: query.trim(),
      match_count: 100,
    });
    if (requestId !== keywordRequestId.current) return; // stale, a newer keystroke has since fired
    setKeywordResults(((data ?? []) as { id: string }[]).map((d) => d.id));
  }

  function selectSuggestion(doc: DocType) {
    setShowSuggestions(false);
    setSuggestions([]);
    setViewerDoc(doc);
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
    } else {
      if (keywordTimer.current) clearTimeout(keywordTimer.current);
      keywordTimer.current = setTimeout(() => runKeywordSearch(value), 200);
    }

    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (value.trim()) {
      const requestId = ++suggestionRequestId.current;
      suggestionTimer.current = setTimeout(async () => {
        const { data } = await supabase.rpc("search_documents" as any, {
          search_query: value.trim(),
          match_count: 8,
        });
        if (requestId !== suggestionRequestId.current) return;
        const ids = ((data ?? []) as { id: string }[]).map((d) => d.id);
        const byId = new Map(documents.map((d) => [d.id, d]));
        setSuggestions(ids.map((id) => byId.get(id)).filter((d): d is DocType => !!d));
        setActiveSuggestion(0);
      }, 200);
    } else {
      setSuggestions([]);
    }
  }

  function switchSearchMode(mode: "keyword" | "semantic") {
    setSearchMode(mode);
    if (mode === "keyword") {
      setSemanticResults([]);
      if (search.trim()) runKeywordSearch(search);
    } else {
      setKeywordResults([]);
      if (search.trim()) handleSemanticSearch(search);
    }
  }

  function getCaseName(caseId: string | null): string | null {
    if (!caseId) return null;
    return cases.find((c) => c.id === caseId)?.title ?? null;
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const meta = ((viewerDoc?.metadata ?? {}) as DocumentMetadata);
  const compareDocNames = Array.from(selectedIds).map(
    (id) => documents.find((d) => d.id === id)?.name ?? "Unknown"
  );

  return (
    <AppLayout>
      <Header
        title="Documents"
        subtitle="Legal Intelligence Repository — search, analyze, and connect all legal knowledge"
      />

      <div className="flex-1 overflow-hidden flex relative">

        {/* Mobile filter overlay backdrop */}
        {mobileFilterOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Filter Sidebar — hidden on mobile, drawer on mobile ────────────────────────────── */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex-col overflow-y-auto transition-transform duration-300 md:static md:w-52 md:max-w-none md:z-auto md:translate-x-0 md:flex ${
          mobileFilterOpen ? "translate-x-0 flex" : "-translate-x-full md:flex hidden"
        }`}>
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus size={13} /> New Document
            </button>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="md:hidden p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close filters"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 p-2 space-y-0.5">
            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Library
            </p>

            {/* All Documents */}
            <button
              onClick={() => { setActiveSection("all"); setFilterCaseId(null); setMobileFilterOpen(false); }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                activeSection === "all"
                  ? "bg-navy-50 text-navy-900 font-semibold border-l-2 border-navy-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText size={13} /> All Documents
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                {counts.all}
              </span>
            </button>

            {/* Recent */}
            <button
              onClick={() => { setActiveSection("recent"); setFilterCaseId(null); setMobileFilterOpen(false); }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                activeSection === "recent"
                  ? "bg-navy-50 text-navy-900 font-semibold border-l-2 border-navy-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock size={13} /> Recent
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                {counts.recent ?? 0}
              </span>
            </button>

            {/* Matter Documents */}
            <div>
              <button
                onClick={() => {
                  setActiveSection("case_linked");
                  setFilterCaseId(null);
                  setCaseFilterExpanded((v) => !v);
                }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                  activeSection === "case_linked"
                    ? "bg-navy-50 text-navy-900 font-semibold border-l-2 border-navy-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Briefcase size={13} /> Matter Docs
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                  {counts.case_linked ?? 0}
                </span>
              </button>

              {caseFilterExpanded && casesWithDocs.length > 0 && (
                <div className="ml-5 mt-0.5 space-y-0.5">
                  {casesWithDocs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveSection("case_linked");
                        setFilterCaseId(c.id);
                        setMobileFilterOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition-colors ${
                        filterCaseId === c.id
                          ? "text-navy-700 font-semibold bg-navy-50"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Folders */}
            <div className="flex items-center justify-between px-2 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Folders
              </p>
              <button
                onClick={() => {
                  setCreatingFolder(true);
                  setNewFolderName("");
                }}
                className="p-0.5 text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded transition-colors"
                aria-label="New folder"
                title="New folder"
              >
                <Plus size={12} />
              </button>
            </div>

            {creatingFolder && (
              <div className="px-2 pb-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateFolder(newFolderName);
                      setCreatingFolder(false);
                    } else if (e.key === "Escape") {
                      setCreatingFolder(false);
                    }
                  }}
                  onBlur={() => {
                    if (newFolderName.trim()) handleCreateFolder(newFolderName);
                    setCreatingFolder(false);
                  }}
                  aria-label="New folder name"
                  placeholder="Folder name"
                  className="w-full px-2 py-1 border border-slate-300 rounded-md text-[11px] text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy-600"
                />
              </div>
            )}

            {folders.map((folder) => (
              <div key={folder.id} className="group">
                {editingFolderId === folder.id ? (
                  <input
                    autoFocus
                    aria-label="Rename folder input"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRenameFolder(folder.id, editingFolderName);
                        setEditingFolderId(null);
                      } else if (e.key === "Escape") {
                        setEditingFolderId(null);
                      }
                    }}
                    onBlur={() => {
                      if (editingFolderName.trim()) handleRenameFolder(folder.id, editingFolderName);
                      setEditingFolderId(null);
                    }}
                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-[11px] text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-600"
                  />
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setActiveSection("folder");
                      setFilterFolderId(folder.id);
                      setMobileFilterOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setActiveSection("folder");
                        setFilterFolderId(folder.id);
                        setMobileFilterOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                      activeSection === "folder" && filterFolderId === folder.id
                        ? "bg-navy-50 text-navy-900 font-semibold border-l-2 border-navy-600"
                        : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Folder size={13} className="shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 group-hover:hidden">
                        {counts[folder.id] ?? 0}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolderId(folder.id);
                          setEditingFolderName(folder.name);
                        }}
                        className="hidden group-hover:inline-flex p-0.5 text-slate-400 hover:text-navy-700 rounded"
                        aria-label="Rename folder"
                        title="Rename folder"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id, folder.name);
                        }}
                        className="hidden group-hover:inline-flex p-0.5 text-slate-400 hover:text-red-500 rounded"
                        aria-label="Delete folder"
                        title="Delete folder"
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            ))}

            {folders.length === 0 && !creatingFolder && (
              <p className="px-2 py-1 text-[11px] text-slate-400">No folders yet</p>
            )}

            <p className="px-2 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Collections
            </p>

            {SMART_COLLECTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setActiveSection(key); setFilterCaseId(null); setMobileFilterOpen(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                  activeSection === key
                    ? "bg-navy-50 text-navy-900 font-semibold border-l-2 border-navy-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                }`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={13} />
                  {label}
                </span>
                {(counts[key] ?? 0) > 0 && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                    {counts[key]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Document List ─────────────────────────────────────────────────── */}
        <div
          className={`flex flex-col border-r border-slate-200 bg-white transition-all ${
            viewerDoc ? "hidden md:flex w-72 shrink-0" : "flex-1"
          }`}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 p-3 border-b border-slate-100">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              aria-label="Open filters"
            >
              <Filter size={18} />
            </button>
            {/* Mobile upload shortcut — avoids requiring the filter drawer just to add a document */}
            <button
              onClick={() => setShowUpload(true)}
              className="md:hidden p-2 text-white bg-navy-950 hover:bg-navy-800 rounded-lg transition-colors shrink-0"
              aria-label="Upload document"
            >
              <Plus size={18} />
            </button>
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {semanticLoading && (
                <Loader2
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500 animate-spin"
                />
              )}
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setShowSuggestions(!!search.trim() && suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={
                  searchMode === "semantic"
                    ? "Semantic search..."
                    : "Search documents..."
                }
                className="w-full pl-7 pr-7 py-1.5 border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map((doc, i) => (
                    <button
                      key={doc.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(doc);
                      }}
                      className={`w-full text-left px-2.5 py-2 flex items-center gap-2 transition-colors ${
                        i === activeSuggestion ? "bg-navy-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <FileText size={12} className="text-navy-400 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-xs text-navy-950">
                        {doc.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 capitalize">
                        {doc.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* KW / AI toggle */}
            <div className="flex rounded-md border border-slate-200 text-[10px] font-semibold overflow-hidden shrink-0">
              <button
                onClick={() => switchSearchMode("keyword")}
                className={`px-2 py-1.5 transition-colors ${
                  searchMode === "keyword"
                    ? "bg-navy-950 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
                title="Keyword search"
              >
                KW
              </button>
              <button
                onClick={() => switchSearchMode("semantic")}
                className={`px-2 py-1.5 transition-colors ${
                  searchMode === "semantic"
                    ? "bg-navy-950 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
                title="Semantic AI search"
              >
                AI
              </button>
            </div>
          </div>

          {/* Search mode notices */}
          {searchMode === "semantic" && semanticResults.length > 0 && (
            <div className="px-3 py-1.5 bg-navy-50 border-b border-navy-100 flex items-center gap-1.5">
              <Sparkles size={11} className="text-navy-600" />
              <p className="text-[11px] text-navy-600 font-medium">
                Showing semantic matches
              </p>
            </div>
          )}
          {searchMode === "semantic" &&
            search.trim() &&
            !semanticLoading &&
            semanticResults.length === 0 &&
            filteredDocs.length === 0 && (
              <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100">
                <p className="text-[11px] text-amber-700">
                  No semantic matches — try keyword search
                </p>
              </div>
            )}

          {/* Document list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={20} className="text-navy-600 animate-spin" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-16 text-center px-6">
                <FileText size={28} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">
                  {search ? "No documents match" : "No documents yet"}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-navy-950 text-white text-xs font-semibold rounded-lg"
                  >
                    <Upload size={12} /> Upload document
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredDocs.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  const caseName = getCaseName(doc.case_id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => openViewer(doc)}
                      className={`flex items-start gap-2.5 p-3 cursor-pointer transition-colors group ${
                        viewerDoc?.id === doc.id
                          ? "bg-navy-50 border-l-2 border-navy-600"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Checkbox for comparison */}
                      <button
                        onClick={(e) => toggleSelectId(doc.id, e)}
                        className="p-1.5 -ml-1.5 -mb-1.5 mt-0.5 -mr-1.5 shrink-0"
                        title="Select for comparison"
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-navy-950 border-navy-950"
                              : "border-slate-300 group-hover:border-slate-400"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 8 8"
                              fill="none"
                            >
                              <path
                                d="M1 4L3 6L7 2"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </button>

                      <div className="p-1.5 rounded-md bg-slate-100 shrink-0 mt-0.5">
                        <File size={12} className="text-slate-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy-950 truncate leading-snug">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${typeColor(doc.type)}`}
                          >
                            {doc.type}
                          </span>
                          {statusIcon(doc.status)}
                          <span className="text-[10px] text-slate-400">
                            {formatSize(doc.file_size)}
                          </span>
                        </div>
                        {caseName && (
                          <p className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 truncate">
                            <Briefcase size={10} className="shrink-0" />
                            <span className="truncate">{caseName}</span>
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatDate(doc.created_at)}
                        </p>
                      </div>

                      {doc.risk_score > 0 && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${riskColor(doc.risk_score)}`}
                        >
                          {doc.risk_score}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc);
                        }}
                        className="p-1.5 -mr-1.5 mt-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                        aria-label="Delete document"
                        title="Delete document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Split Viewer ──────────────────────────────────────────────────── */}
        {viewerDoc ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

            {/* Document Text Pane */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white flex-wrap gap-y-2">
                {/* Back button on mobile */}
                <button
                  onClick={() => setViewerDoc(null)}
                  className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                  aria-label="Back to list"
                >
                  <X size={16} />
                </button>
                <div className="p-1.5 rounded-md bg-navy-50 shrink-0">
                  <FileText size={14} className="text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-950 truncate">
                    {viewerDoc.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${typeColor(viewerDoc.type)}`}
                    >
                      {viewerDoc.type}
                    </span>
                    {viewerDoc.risk_score > 0 && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${riskColor(viewerDoc.risk_score)}`}
                      >
                        Risk {viewerDoc.risk_score}/100
                      </span>
                    )}
                  </div>
                </div>

                {/* Case link — hidden on mobile to leave room for the document name; still available at md+ */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  <Briefcase size={12} className="text-slate-400" />
                  <select
                    value={viewerDoc.case_id ?? ""}
                    onChange={(e) =>
                      handleLinkCase(viewerDoc.id, e.target.value || null)
                    }
                    disabled={linkingCase}
                    className="text-[11px] bg-white border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-navy-600 max-w-[140px] disabled:opacity-50"
                  >
                    <option value="">No case</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  {linkingCase && (
                    <Loader2
                      size={11}
                      className="animate-spin text-slate-400 shrink-0"
                    />
                  )}
                </div>

                {/* Folder assign — same mobile treatment as the case link above */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  <Folder size={12} className="text-slate-400" />
                  <select
                    value={viewerDoc.folder_id ?? ""}
                    onChange={(e) =>
                      handleLinkFolder(viewerDoc.id, e.target.value || null)
                    }
                    disabled={linkingFolder}
                    className="text-[11px] bg-white border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-navy-600 max-w-[140px] disabled:opacity-50"
                  >
                    <option value="">No folder</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  {linkingFolder && (
                    <Loader2
                      size={11}
                      className="animate-spin text-slate-400 shrink-0"
                    />
                  )}
                </div>

                {viewerDoc.storage_path && (
                  <button
                    onClick={() => setShowOriginalDoc(true)}
                    className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-navy-700 hover:text-navy-900 hover:bg-navy-50 rounded-md transition-colors shrink-0"
                    title="View original file"
                  >
                    <File size={13} /> <span className="hidden sm:inline">View Original</span>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(viewerDoc)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                  title="Delete document"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setViewerDoc(null)}
                  className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* In-doc search */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <div className="relative">
                  <Search
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={viewerSearch}
                    onChange={(e) => setViewerSearch(e.target.value)}
                    placeholder="Search within document..."
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-md text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy-600 bg-white"
                  />
                </div>
              </div>

              {/* Text body */}
              <div className="flex-1 overflow-y-auto p-5">
                {viewerDoc.status === "processing" ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2
                      size={24}
                      className="text-navy-600 animate-spin mb-3"
                    />
                    <p className="text-sm font-medium text-navy-900">
                      Processing document...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      AI is analyzing and indexing your document
                    </p>
                  </div>
                ) : viewerDoc.status === "error" ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <AlertCircle
                      size={24}
                      className="text-red-400 mb-3"
                    />
                    <p className="text-sm font-medium text-red-600">
                      Processing failed
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Unable to process this document
                    </p>
                  </div>
                ) : viewerDoc.extracted_text ? (
                  <pre className="whitespace-pre-wrap text-xs font-mono text-slate-700 leading-relaxed">
                    {viewerSearch.trim()
                      ? highlightText(viewerDoc.extracted_text, viewerSearch)
                      : viewerDoc.extracted_text}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20">
                    <File size={24} className="text-slate-200 mb-3" />
                    <p className="text-sm text-slate-400">
                      No text content available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Panel */}
            <div className="w-full md:w-80 shrink-0 flex flex-col max-h-[45vh] md:max-h-none overflow-hidden bg-white border-t md:border-t-0 md:border-l border-slate-200">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 shrink-0">
                {(["summary", "analysis", "timeline"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAiTab(tab)}
                    className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors border-b-2 ${
                      aiTab === tab
                        ? "border-navy-600 text-navy-900"
                        : "border-transparent text-slate-400 hover:text-navy-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* ── Summary Tab ─────────────────────────────────────────── */}
                {aiTab === "summary" && (
                  <div className="space-y-4">
                    {/* Structured metadata from embed-document */}
                    {viewerDoc.metadata && (
                      <div className="space-y-3">
                        {meta.document_type && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Detected Type
                            </p>
                            <p className="text-xs text-navy-900">
                              {meta.document_type}
                            </p>
                          </div>
                        )}
                        {meta.parties && meta.parties.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Parties
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {meta.parties.map((p, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] bg-navy-50 text-navy-700 px-1.5 py-0.5 rounded-full"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {meta.key_provisions && meta.key_provisions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Key Provisions
                            </p>
                            <ul className="space-y-1">
                              {meta.key_provisions.slice(0, 5).map((p, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-600 flex items-start gap-1.5"
                                >
                                  <span className="text-navy-400 mt-0.5 shrink-0">•</span>
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {meta.risk_summary && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
                              Risk Summary
                            </p>
                            <p className="text-xs text-amber-900">
                              {meta.risk_summary}
                            </p>
                          </div>
                        )}
                        {meta.issues_identified && meta.issues_identified.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Issues Identified
                            </p>
                            <ul className="space-y-1">
                              {meta.issues_identified.map((issue, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-600 flex items-start gap-1.5"
                                >
                                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="border-t border-slate-100" />
                      </div>
                    )}

                    {/* AI Summary */}
                    {viewerDoc.ai_summary ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 p-2 bg-navy-50 rounded-lg border border-navy-100">
                          <Bot size={13} className="text-navy-600 shrink-0" />
                          <span className="text-[11px] font-medium text-navy-700">
                            AI Summary — CIMA AI
                          </span>
                        </div>
                        <div className="prose-doc text-xs leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {viewerDoc.ai_summary}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Bot size={24} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">
                          {viewerDoc.status === "processing"
                            ? "AI analysis in progress..."
                            : "No summary generated yet"}
                        </p>
                      </div>
                    )}

                    {viewerDoc.status === "ready" && (
                      <button
                        onClick={handleSummarize}
                        disabled={aiActionLoading === "summarize"}
                        className="w-full flex items-center justify-center gap-1.5 py-2 border border-navy-200 text-navy-700 text-xs font-medium rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-50"
                      >
                        {aiActionLoading === "summarize" ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {viewerDoc.ai_summary ? "Regenerate Summary" : "Generate Summary"}
                      </button>
                    )}
                  </div>
                )}

                {/* ── Analysis Tab ─────────────────────────────────────────── */}
                {aiTab === "analysis" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={handleExtractIssues}
                        disabled={!!aiActionLoading}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50"
                      >
                        {aiActionLoading === "issues" ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Scale size={11} />
                        )}
                        Extract Issues
                      </button>
                      <button
                        onClick={handleExtractObligations}
                        disabled={!!aiActionLoading}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {aiActionLoading === "obligations" ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <FileText size={11} />
                        )}
                        Obligations
                      </button>
                    </div>

                    {(aiActionLoading === "issues" || aiActionLoading === "obligations") && (
                      <div className="flex flex-col items-center py-8">
                        <Loader2
                          size={20}
                          className="text-navy-600 animate-spin mb-2"
                        />
                        <p className="text-xs text-slate-400">Analyzing document...</p>
                      </div>
                    )}

                    {!aiActionLoading && (
                      <>
                        {issuesResult && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">
                              Legal Issues
                            </p>
                            <div className="prose-doc text-xs leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {issuesResult}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {obligationsResult && (
                          <div className={`space-y-1 ${issuesResult ? "border-t border-slate-100 pt-3" : ""}`}>
                            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                              Obligations
                            </p>
                            <div className="prose-doc text-xs leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {obligationsResult}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {!issuesResult && !obligationsResult && (
                          <div className="text-center py-8">
                            <Scale
                              size={24}
                              className="text-slate-200 mx-auto mb-2"
                            />
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Extract legal issues or obligations from this document using AI.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Timeline Tab ─────────────────────────────────────────── */}
                {aiTab === "timeline" && (
                  <div className="space-y-3">
                    <button
                      onClick={handleCreateTimeline}
                      disabled={!!aiActionLoading}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
                    >
                      {aiActionLoading === "timeline" ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Calendar size={12} />
                      )}
                      Create Timeline
                    </button>

                    {aiActionLoading === "timeline" ? (
                      <div className="flex flex-col items-center py-8">
                        <Loader2
                          size={20}
                          className="text-navy-600 animate-spin mb-2"
                        />
                        <p className="text-xs text-slate-400">
                          Building chronology...
                        </p>
                      </div>
                    ) : timelineResult ? (
                      <div className="prose-doc text-xs leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {timelineResult}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar
                          size={24}
                          className="text-slate-200 mx-auto mb-2"
                        />
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Generate a chronological timeline of all dates and events in this document.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-slate-200 p-3 space-y-2 shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      navigate("/drafting", {
                        state: {
                          fromDocument: {
                            name: viewerDoc.name,
                            type: viewerDoc.type,
                            content: viewerDoc.extracted_text?.slice(0, 6000) ?? "",
                            summary: viewerDoc.ai_summary ?? "",
                          },
                        },
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-navy-950 text-white text-[11px] font-medium rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    <ExternalLink size={11} /> Use in Draft
                  </button>
                  <button
                    onClick={() =>
                      navigate("/research", {
                        state: { initialQuery: viewerDoc.name },
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-300 text-slate-600 text-[11px] font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Search size={11} /> Find Authority
                  </button>
                </div>
                <button
                  onClick={handleGenerateBrief}
                  disabled={aiActionLoading === "brief"}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-gold-500 hover:bg-gold-400 text-navy-950 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {aiActionLoading === "brief" ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Bot size={11} />
                  )}
                  Generate Brief
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Welcome state — desktop only; on mobile the list already fills the screen when nothing is selected */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50 p-8">
            <div className="text-center max-w-sm">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 mx-auto mb-4 shadow-sm">
                <FileText size={24} className="text-navy-300" />
              </div>
              <h3 className="text-base font-semibold text-navy-950 mb-2">
                Document Intelligence
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Select a document to view its contents and run AI analysis, or
                upload new documents to build your legal knowledge repository.
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Upload size={14} /> Upload Document
              </button>
              <p className="text-xs text-slate-400 mt-3">
                Supports PDF, DOCX, and TXT files
              </p>
              {documents.length >= 2 && (
                <p className="text-xs text-slate-400 mt-2">
                  Tip: check 2 documents to compare them side-by-side
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Floating Compare Bar ──────────────────────────────────────────── */}
        {selectedIds.size === 2 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 md:gap-3 bg-navy-950 text-white px-3 md:px-5 py-2.5 md:py-3 rounded-2xl shadow-xl mx-2">
            <GitCompare size={15} className="text-gold-400 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Compare: </span>
              <span className="text-slate-300 text-xs">
                {compareDocNames[0]?.slice(0, 20)}
                {(compareDocNames[0]?.length ?? 0) > 20 ? "…" : ""}
                {" vs "}
                {compareDocNames[1]?.slice(0, 20)}
                {(compareDocNames[1]?.length ?? 0) > 20 ? "…" : ""}
              </span>
            </div>
            <button
              onClick={handleCompare}
              className="px-3 py-1.5 bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold rounded-lg transition-colors"
            >
              Compare
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Upload Modal ───────────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-4 sm:my-0">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-navy-50">
                  <Upload size={15} className="text-navy-700" />
                </div>
                <h2 className="text-base font-bold text-navy-950">Add Document</h2>
              </div>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadError("");
                  setSelectedFileName("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {uploadError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  Document Name
                </label>
                <input
                  value={uploadForm.name}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  placeholder="e.g. Shareholder Agreement — 2025"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to use filename
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  Document Type
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, type: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent bg-white"
                >
                  {UPLOAD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {cases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-navy-900 mb-1.5">
                    Link to Case{" "}
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={uploadForm.caseId}
                    onChange={(e) =>
                      setUploadForm((p) => ({ ...p, caseId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent bg-white"
                  >
                    <option value="">No case</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                        {c.matter_number ? ` (${c.matter_number})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  File
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${selectedFileName ? "border-navy-400 bg-navy-50" : "border-slate-300 hover:border-navy-400"}`}
                  onClick={() => fileRef.current?.click()}
                >
                  {selectedFileName ? (
                    <>
                      <CheckCircle2 size={20} className="text-navy-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-navy-800 break-all">{selectedFileName}</p>
                      <p className="text-xs text-slate-400 mt-1">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Click to select a file</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, DOCX, and TXT supported</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name ?? "")}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(false);
                    setUploadError("");
                  }}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Adding...
                    </>
                  ) : (
                    "Add Document"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Compare Modal ──────────────────────────────────────────────────────── */}
      {showCompare && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] my-4 sm:my-0 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <GitCompare size={16} className="text-navy-600" />
                <h2 className="text-base font-bold text-navy-950">
                  Document Comparison
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCompare(false);
                  setSelectedIds(new Set());
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Document labels */}
            <div className="flex flex-wrap gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
              {Array.from(selectedIds).map((id, idx) => {
                const doc = documents.find((d) => d.id === id);
                return doc ? (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <span className="font-semibold text-navy-700">
                      {idx === 0 ? "A:" : "B:"}
                    </span>
                    <span className="text-slate-600 truncate max-w-[180px]">
                      {doc.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeColor(doc.type)}`}
                    >
                      {doc.type}
                    </span>
                  </div>
                ) : null;
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {compareLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2
                    size={28}
                    className="text-navy-600 animate-spin mb-4"
                  />
                  <p className="text-sm font-medium text-navy-900">
                    CIMA AI is comparing documents...
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Analyzing similarities, differences, and legal implications
                  </p>
                </div>
              ) : compareResult ? (
                <div className="prose-doc text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {compareResult}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>

            {!compareLoading && compareResult && (
              <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => navigator.clipboard.writeText(compareResult).then(() => showToast("Copied to clipboard"))}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  onClick={() => {
                    setShowCompare(false);
                    setSelectedIds(new Set());
                    navigate("/drafting", {
                      state: {
                        fromDocument: {
                          name: "Document Comparison Analysis",
                          type: "document",
                          content: compareResult,
                          summary: "",
                        },
                      },
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition-colors"
                >
                  <ExternalLink size={12} /> Open in Drafting Studio
                </button>
                <button
                  onClick={() => {
                    setShowCompare(false);
                    setSelectedIds(new Set());
                  }}
                  className="ml-auto px-3 py-2 text-slate-500 text-xs font-medium hover:text-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Brief Modal ────────────────────────────────────────────────────────── */}
      {showBriefModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] my-4 sm:my-0 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <Bot size={16} className="text-navy-600" />
                <h2 className="text-base font-bold text-navy-950">
                  Generated Brief
                </h2>
              </div>
              <button
                onClick={() => setShowBriefModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose-doc text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {briefResult}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => navigator.clipboard.writeText(briefResult).then(() => showToast("Copied to clipboard"))}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Copy size={12} /> Copy
              </button>
              {viewerDoc && (
                <button
                  onClick={() => {
                    setShowBriefModal(false);
                    navigate("/drafting", {
                      state: {
                        fromDocument: {
                          name: `Brief — ${viewerDoc.name}`,
                          type: "brief",
                          content: briefResult,
                          summary: "",
                        },
                      },
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition-colors"
                >
                  <ExternalLink size={12} /> Open in Drafting Studio
                </button>
              )}
              <button
                onClick={() => setShowBriefModal(false)}
                className="ml-auto px-3 py-2 text-slate-500 text-xs font-medium hover:text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Original Document Modal ───────────────────────────────────────────── */}
      {showOriginalDoc && viewerDoc && (
        <OriginalDocumentModal
          doc={viewerDoc}
          onClose={() => setShowOriginalDoc(false)}
        />
      )}
    </AppLayout>
  );
}

// ─── Original Document Modal ────────────────────────────────────────────────

function OriginalDocumentModal({
  doc,
  onClose,
}: {
  doc: DocType;
  onClose: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const ext = (doc.storage_path ?? "").split(".").pop()?.toLowerCase() ?? "";
  const isPdf = ext === "pdf";
  const isDocx = ext === "docx" || ext === "doc";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!doc.storage_path) {
        setError("Original file is not available for this document.");
        setLoading(false);
        return;
      }

      const { data, error: signErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 3600);

      if (cancelled) return;
      if (signErr || !data?.signedUrl) {
        setError("Could not load the original file.");
        setLoading(false);
        return;
      }
      setSignedUrl(data.signedUrl);

      if (isDocx) {
        try {
          const res = await fetch(data.signedUrl);
          const buffer = await res.arrayBuffer();
          const { renderAsync } = await import("docx-preview");
          if (cancelled || !docxContainerRef.current) return;
          await renderAsync(buffer, docxContainerRef.current);
        } catch {
          if (!cancelled) setError("Could not render this document.");
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [doc.storage_path, isDocx]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full h-full sm:max-w-5xl sm:h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText size={16} className="text-navy-600 shrink-0" />
            <h2 className="text-base font-bold text-navy-950 truncate">
              {doc.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
              <Loader2 size={24} className="text-navy-600 animate-spin mb-3" />
              <p className="text-sm text-navy-900">
                Loading original document...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AlertCircle size={24} className="text-red-400 mb-3" />
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}

          {!error && isPdf && signedUrl && (
            <iframe
              src={signedUrl}
              title={doc.name}
              className="w-full h-full border-0"
            />
          )}

          {!error && isDocx && (
            <div className="w-full h-full overflow-auto bg-slate-100 p-6">
              <div ref={docxContainerRef} className="mx-auto" />
            </div>
          )}

          {!error && !isPdf && !isDocx && !loading && signedUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <File size={24} className="text-slate-300" />
              <p className="text-sm text-slate-500">
                Preview not available for this file type.
              </p>
              <a
                href={signedUrl}
                download={doc.name}
                className="flex items-center gap-1.5 px-3 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 transition-colors"
              >
                Download original
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
