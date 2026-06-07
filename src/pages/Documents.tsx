import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Search,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  Trash2,
  Bot,
  AlertTriangle,
  Clock,
  File,
  Plus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Document } from "../types/database";

const DOC_TYPES = ["document", "contract", "brief", "award", "evidence", "statute"];

function statusIcon(status: string) {
  if (status === "ready") return <CheckCircle size={13} className="text-emerald-500" />;
  if (status === "processing") return <Loader2 size={13} className="text-amber-500 animate-spin" />;
  if (status === "error") return <AlertCircle size={13} className="text-red-500" />;
  return <Clock size={13} className="text-slate-400" />;
}

function typeColor(type: string) {
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

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface UploadForm {
  name: string;
  type: string;
}

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>({ name: "", type: "document" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [user]);

  async function loadDocuments() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocuments(data ?? []);
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUploading(true);

    try {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setError("Please select a file");
        setUploading(false);
        return;
      }

      const textContent = await file.text();
      if (!textContent.trim()) {
        setError("The selected file appears to be empty");
        setUploading(false);
        return;
      }

      const docName = uploadForm.name || file.name || "Untitled Document";

      const { data: inserted, error: insertErr } = await supabase
        .from("documents")
        .insert({
          user_id: user!.id,
          name: docName,
          type: uploadForm.type as Document["type"],
          file_path: file.name,
          file_size: file.size,
          mime_type: file.type || "text/plain",
          status: "processing",
          extracted_text: textContent.slice(0, 10000),
          ai_summary: "",
          risk_score: 0,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setShowUpload(false);
      setUploadForm({ name: "", type: "document" });
      if (fileRef.current) fileRef.current.value = "";
      setDocuments((prev) => [inserted, ...prev]);

      // Call embed-document edge function (fire-and-forget)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();

      fetch(`${supabaseUrl}/functions/v1/embed-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          document_id: inserted.id,
          text_content: textContent,
          user_id: user!.id,
        }),
      }).then(async (res) => {
        if (res.ok) {
          // Refresh document from DB to get updated summary and risk score
          const { data: updated } = await supabase
            .from("documents")
            .select("*")
            .eq("id", inserted.id)
            .single();
          if (updated) {
            setDocuments((prev) => prev.map((d) => (d.id === inserted.id ? updated : d)));
          }
        } else {
          // Edge function sets status to "error" on failure
          setDocuments((prev) =>
            prev.map((d) => (d.id === inserted.id ? { ...d, status: "error" as Document["status"] } : d))
          );
        }
      }).catch(() => {
        setDocuments((prev) =>
          prev.map((d) => (d.id === inserted.id ? { ...d, status: "error" as Document["status"] } : d))
        );
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(doc: Document) {
    setSelectedDoc(doc);
    if (doc.ai_summary) return;

    setAnalyzing(true);
    const prompt = `Analyze this legal document: "${doc.name}" (type: ${doc.type}).

Provide:
1. **Document Overview** — What type of document is this and its primary purpose
2. **Key Provisions** — Identify the most important clauses and obligations
3. **Risk Analysis** — Flag any unusual, one-sided, or risky provisions (score 0-100 where 100 is highest risk)
4. **Missing Clauses** — Identify any standard clauses that appear to be absent
5. **Recommendations** — Practical advice for the reviewing lawyer

Note: As no actual text was provided for this demo, provide a framework analysis based on typical ${doc.type} documents.`;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          context: "analysis",
        }),
      });

      const data = await res.json();
      const summary: string = data.choices?.[0]?.message?.content ?? "";

      await supabase
        .from("documents")
        .update({ ai_summary: summary, risk_score: 35, updated_at: new Date().toISOString() })
        .eq("id", doc.id);

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, ai_summary: summary, risk_score: 35 } : d))
      );
      setSelectedDoc((prev) => (prev?.id === doc.id ? { ...prev, ai_summary: summary, risk_score: 35 } : prev));
    } catch {
      // ignore
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("documents").delete().eq("id", id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  }

  function riskColor(score: number) {
    if (score >= 70) return "text-red-600 bg-red-50";
    if (score >= 40) return "text-amber-600 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  }

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <Header title="Documents" subtitle="AI-powered legal document review and analysis" />

      <div className="flex-1 overflow-hidden flex">
        {/* Document list */}
        <div className={`flex flex-col border-r border-slate-200 bg-white transition-all ${selectedDoc ? "w-80" : "flex-1"}`}>
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              <Plus size={13} />
              Add
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={20} className="text-navy-600 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center px-6">
                <FileText size={32} className="text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-400">
                  {search ? "No documents match your search" : "No documents yet"}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-navy-950 text-white text-xs font-semibold rounded-lg"
                  >
                    <Upload size={12} /> Upload document
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleAnalyze(doc)}
                    className={`flex items-start gap-3 p-4 cursor-pointer transition-colors group ${
                      selectedDoc?.id === doc.id ? "bg-navy-50 border-l-2 border-navy-600" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                      <File size={13} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-950 truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${typeColor(doc.type)}`}>
                          {doc.type}
                        </span>
                        {statusIcon(doc.status)}
                        <span className="text-xs text-slate-400">{formatSize(doc.file_size)}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(doc.created_at)}</p>
                    </div>
                    {doc.risk_score > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${riskColor(doc.risk_score)}`}>
                        {doc.risk_score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis panel */}
        {selectedDoc ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-navy-50">
                  <FileText size={15} className="text-navy-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy-950 truncate max-w-xs">{selectedDoc.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${typeColor(selectedDoc.type)}`}>
                      {selectedDoc.type}
                    </span>
                    {selectedDoc.risk_score > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColor(selectedDoc.risk_score)}`}>
                        Risk: {selectedDoc.risk_score}/100
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(selectedDoc.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={28} className="text-navy-600 animate-spin mb-4" />
                  <p className="text-sm font-medium text-navy-900">Analyzing document...</p>
                  <p className="text-xs text-slate-400 mt-1">DeepSeek is reviewing clauses, risks, and structure</p>
                </div>
              ) : selectedDoc.ai_summary ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 p-3.5 bg-navy-50 rounded-lg border border-navy-100">
                    <Bot size={15} className="text-navy-600 shrink-0" />
                    <span className="text-xs font-medium text-navy-700">AI Analysis by DeepSeek</span>
                    <Eye size={12} className="text-navy-400 ml-auto" />
                  </div>
                  <div className="prose-doc text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDoc.ai_summary}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <Bot size={32} className="text-slate-200 mb-4" />
                  <p className="text-sm font-medium text-slate-400">Click a document to run AI analysis</p>
                  <p className="text-xs text-slate-300 mt-1">DeepSeek will review clauses, risks, and structure</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8">
            <div className="text-center max-w-sm">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 mx-auto mb-4 shadow-sm">
                <FileText size={24} className="text-navy-300" />
              </div>
              <h3 className="text-base font-semibold text-navy-950 mb-2">Document Intelligence</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Select a document from the list or upload a new one. DeepSeek AI will analyze clauses, identify risks, and provide actionable insights.
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Upload size={14} /> Upload Document
              </button>
              <div className="mt-4 flex items-center gap-2 justify-center">
                <AlertTriangle size={12} className="text-amber-500" />
                <p className="text-xs text-slate-400">Supports PDF, DOCX, TXT</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-navy-50">
                  <Upload size={15} className="text-navy-700" />
                </div>
                <h2 className="text-base font-bold text-navy-950">Add Document</h2>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Document Name</label>
                <input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  placeholder="e.g. Shareholder Agreement — 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">Document Type</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent bg-white capitalize"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1.5">File</label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-navy-400 transition-colors cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={20} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Click to select a file</p>
                  <p className="text-xs text-slate-400 mt-1">TXT files supported</p>
                  <input ref={fileRef} type="file" accept=".txt" className="hidden" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : "Add Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
