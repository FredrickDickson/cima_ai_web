import { useEffect, useState } from "react";
import { FileText, Loader2, Sparkles, ChevronDown, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { callCaseAI, type CaseContext } from "../caseAI";

type Doc = {
  id: string;
  name: string;
  file_type?: string;
  status?: string;
  created_at: string;
  ai_summary?: string;
  extracted_text?: string;
};

const AI_DOC_ACTIONS = [
  {
    label: "Summarize",
    prompt: (doc: Doc) =>
      `Summarize the following document titled "${doc.name}" in 3-5 clear paragraphs covering: purpose, key provisions, parties' obligations, important dates/deadlines, and any notable concerns.\n\nDocument:\n${(doc.extracted_text ?? "").slice(0, 6000)}`,
  },
  {
    label: "Extract Issues",
    prompt: (doc: Doc) =>
      `From the document titled "${doc.name}", identify and list all key legal issues, disputes, or contentious provisions. For each issue, explain why it is significant and what position each party may take.\n\nDocument:\n${(doc.extracted_text ?? "").slice(0, 6000)}`,
  },
  {
    label: "Generate Timeline",
    prompt: (doc: Doc) =>
      `Extract all dates, events, and deadlines from the document titled "${doc.name}" and present them as a chronological timeline. Format each entry as: [DATE] — [EVENT/OBLIGATION].\n\nDocument:\n${(doc.extracted_text ?? "").slice(0, 6000)}`,
  },
];

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-emerald-500/10 text-emerald-400",
  processing: "bg-amber-500/10 text-amber-400",
  error: "bg-red-500/10 text-red-400",
  pending: "bg-slate-500/10 text-slate-400",
};

export default function DocumentsTab({ caseId, caseData }: { caseId: string; caseData: CaseContext }) {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("documents")
      .select("id, name, file_type, status, created_at, ai_summary, extracted_text")
      .eq("case_id", caseId).order("created_at", { ascending: false })
      .then(({ data }) => { setDocs(data ?? []); setLoading(false); });
  }, [caseId]);

  async function runDocAI(doc: Doc, actionIndex: number) {
    if (!doc.extracted_text) return;
    const key = `${doc.id}-${actionIndex}`;
    setAiLoading(key);
    try {
      const result = await callCaseAI(caseData, AI_DOC_ACTIONS[actionIndex].prompt(doc));
      setAiResults(p => ({ ...p, [key]: result }));
    } finally {
      setAiLoading(null);
    }
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading documents...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
        <button onClick={() => navigate(`/documents?case_id=${caseId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
          <ExternalLink size={13} />Upload Document
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-navy-700 rounded-xl">
          <FileText size={32} className="mx-auto mb-3 text-slate-700 opacity-40" />
          <p className="text-sm text-slate-500">No documents linked to this case.</p>
          <p className="text-xs text-slate-600 mt-1">Upload documents in the Documents section and link them here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => {
            const isExpanded = expanded === doc.id;
            const hasText = !!doc.extracted_text;
            return (
              <div key={doc.id} className="border border-navy-700 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(p => p === doc.id ? null : doc.id)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-navy-800/30 transition-colors text-left">
                  <div className="w-9 h-9 rounded-lg bg-navy-700 flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-gold-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{doc.name}</span>
                      {doc.status && <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[doc.status] ?? ""}`}>{doc.status}</span>}
                    </div>
                    {doc.ai_summary && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{doc.ai_summary}</p>}
                    <p className="text-xs text-slate-600 mt-0.5">{new Date(doc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <ChevronDown size={14} className={`text-slate-500 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-navy-800 space-y-3">
                    {doc.ai_summary && (
                      <div className="pt-3">
                        <p className="text-xs font-medium text-slate-500 mb-1">AI Summary</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{doc.ai_summary}</p>
                      </div>
                    )}
                    {hasText ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {AI_DOC_ACTIONS.map((action, i) => {
                          const key = `${doc.id}-${i}`;
                          return (
                            <button key={i} onClick={() => runDocAI(doc, i)} disabled={!!aiLoading}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gold-500/20 text-gold-400 hover:bg-gold-500/10 transition-colors disabled:opacity-50">
                              {aiLoading === key ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 pt-1">Document text not available for AI analysis (still processing or upload error).</p>
                    )}
                    {AI_DOC_ACTIONS.map((action, i) => {
                      const key = `${doc.id}-${i}`;
                      return aiResults[key] ? (
                        <div key={key} className="bg-navy-900/50 border border-gold-500/15 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gold-400 mb-2 flex items-center gap-1.5"><Sparkles size={11} />{action.label}</p>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{aiResults[key]}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
