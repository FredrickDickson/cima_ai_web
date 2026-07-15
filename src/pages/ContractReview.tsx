import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  ClipboardCheck,
  Upload,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Scale,
  FileText,
  Sparkles,
  Bot,
  Copy,
  Users,
  Gavel,
  TrendingUp,
  GitCompare,
  Globe,
  Info,
  Building2,
  Plus,
  Download,
  ChevronRight,
  Wand2,
  ExternalLink,
  Settings,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import RichTextEditor from "../components/ui/RichTextEditor";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { exportToWord, exportToPdf } from "../lib/exportDraft";
import type { ContractClauseAnalysis, MissingClause, ContractAnalysis, Case } from "../types/database";

interface AnalysisResult {
  id?: string;
  overall_risk_score: number;
  detected_document_type?: string;
  ai_summary: string;
  arbitration_clause_valid: boolean;
  arbitration_clause_issues: string;
  arbitration_seat?: string;
  arbitration_institution?: string;
  arbitration_improved?: string;
  governing_law_found: boolean;
  governing_law: string;
  detected_parties?: { party_a_name: string; party_b_name: string };
  clauses: ContractClauseAnalysis[];
  missing_clauses: MissingClause[];
  obligations: { party_a: string[]; party_b: string[] };
  recommendations: string[];
  negotiation_points?: string[];
  ai_insights?: string;
  contract_text: string;
}

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const RISK_ICONS: Record<string, React.ReactNode> = {
  critical: <XCircle size={12} className="text-red-500" />,
  high: <AlertTriangle size={12} className="text-orange-500" />,
  medium: <AlertCircle size={12} className="text-amber-500" />,
  low: <CheckCircle2 size={12} className="text-emerald-500" />,
};

const RISK_HIGHLIGHT: Record<string, string> = {
  critical: "#fee2e2",
  high: "#ffedd5",
  medium: "#fef9c3",
  low: "#d1fae5",
};

const DOCUMENT_TYPE_OPTIONS = [
  { value: "commercial", label: "Commercial Contract" },
  { value: "employment", label: "Employment Agreement" },
  { value: "real_estate", label: "Lease / Real Estate" },
  { value: "arbitration_agreement", label: "Arbitration Agreement" },
  { value: "court_award", label: "Court Award / Judgment" },
  { value: "settlement", label: "Settlement Agreement" },
  { value: "mou", label: "MOU / Letter of Intent" },
  { value: "shareholder", label: "Shareholder Agreement" },
  { value: "joint venture", label: "Joint Venture" },
  { value: "technology", label: "Technology / SaaS" },
  { value: "finance", label: "Finance Agreement" },
  { value: "construction", label: "Construction Contract" },
  { value: "general", label: "General Document" },
];

const DEFECT_LABELS: Record<string, { label: string; color: string }> = {
  ambiguity:           { label: "Ambiguity",           color: "bg-purple-100 text-purple-700 border-purple-200" },
  unenforceable:       { label: "Unenforceable",        color: "bg-red-100 text-red-700 border-red-200" },
  jurisdictional:      { label: "Jurisdictional Defect", color: "bg-orange-100 text-orange-700 border-orange-200" },
  missing_obligation:  { label: "Missing Obligation",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  liability:           { label: "Excessive Liability",  color: "bg-rose-100 text-rose-700 border-rose-200" },
  arbitration:         { label: "Arbitration Issue",    color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  risk:                { label: "General Risk",         color: "bg-slate-100 text-slate-700 border-slate-200" },
};

const JURISDICTIONS = [
  "Ghana", "Kenya", "Nigeria", "South Africa", "Uganda", "Tanzania",
  "Zambia", "Zimbabwe", "Malawi", "Namibia", "Botswana", "Rwanda",
  "Mauritius", "Eswatini", "Lesotho", "Mozambique", "England & Wales",
  "Singapore", "United States",
];

const CLAUSE_ACTIONS = [
  { id: "explain", label: "Explain", prompt: "Explain this document provision in plain English, including its legal effect and implications for all parties:" },
  { id: "simplify", label: "Simplify", prompt: "Rewrite this provision in simpler language while preserving its legal meaning:" },
  { id: "rewrite", label: "Rewrite", prompt: "Rewrite this provision to be clearer, fairer, and more professionally drafted:" },
  { id: "mutual", label: "Make Mutual", prompt: "Rewrite this provision to be mutual and balanced for all parties:" },
  { id: "reduce", label: "Reduce Risk", prompt: "Rewrite this provision to reduce risk and liability exposure for the reviewing party:" },
  { id: "alternative", label: "Alternative", prompt: "Provide a market-standard alternative to this provision:" },
];

const STEPS = ["Parsing text", "Identifying clauses", "Risk scoring", "Checking compliance", "Extracting obligations", "Generating insights"];

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    let totalTextLength = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
      pages.push(pageText);
      totalTextLength += pageText.trim().length;
    }

    if (totalTextLength < 50 && pdf.numPages > 0) {
      console.log("No embedded text found in PDF, falling back to OCR...");
      const Tesseract = await import("tesseract.js");
      const ocrPages: string[] = [];
      
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit OCR to 10 pages for perf
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        const dataUrl = canvas.toDataURL("image/png");
        const recognize = Tesseract.recognize || (Tesseract as any).default?.recognize;
        const { data: { text } } = await recognize(dataUrl, "eng");
        ocrPages.push(text);
      }
      return ocrPages.join("\n\n");
    }

    return pages.join("\n\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  return file.text();
}

type AnalysisTab = "overview" | "clauses" | "obligations" | "risks" | "missing" | "redlines" | "arbitration" | "ai_insights";

function RiskGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#10b981";
  const label = score >= 70 ? "High Risk" : score >= 40 ? "Medium Risk" : "Low Risk";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-12 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 125.66} 125.66`}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-lg font-bold text-navy-950">{score}</span>
        </div>
      </div>
      <p className="text-xs font-semibold mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function stripMarkdown(text: string): string {
  return text
    // Remove heading markers but keep the heading text and line break
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers, keep content
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")   // ***bold italic***
    .replace(/\*\*([^*]+)\*\*/g, "$1")        // **bold**
    .replace(/\*([^*\n]+)\*/g, "$1")          // *italic* (not across lines)
    .replace(/__([^_]+)__/g, "$1")            // __bold__
    .replace(/_([^_\n]+)_/g, "$1")            // _italic_ (not across lines)
    // Remove inline code but keep content
    .replace(/`([^`\n]+)`/g, "$1")
    // Remove fenced code blocks but keep content
    .replace(/^```[^\n]*\n([\s\S]*?)^```/gm, "$1")
    // Remove blockquote markers but keep text and indentation
    .replace(/^>\s?/gm, "  ")
    // Remove horizontal rules entirely (leave blank line)
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Remove link syntax but keep link text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove image syntax
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Tables: keep the | separators and cell text, just clean up the separator rows (|---|---|)
    .replace(/^\|[-:| ]+\|$/gm, "")
    // Keep bullet/numbered list markers (they help readability in plain text)
    // Keep all line breaks, spacing, indentation, and signature blocks as-is
    .trim();
}

function applyDocumentFormatting(html: string): string {
  const lines = html.split("\n");
  const processed: string[] = [];
  for (const line of lines) {
    if (/^# /.test(line)) {
      processed.push(`<h1 style="font-size:1.2em;font-weight:700;color:#0f172a;margin:1.6em 0 0.5em;padding-bottom:0.3em;border-bottom:1px solid #e2e8f0;line-height:1.3">${line.slice(2)}</h1>`);
    } else if (/^## /.test(line)) {
      processed.push(`<h2 style="font-size:1.05em;font-weight:700;color:#1e293b;margin:1.3em 0 0.4em;line-height:1.3">${line.slice(3)}</h2>`);
    } else if (/^### /.test(line)) {
      processed.push(`<h3 style="font-size:0.85em;font-weight:600;color:#334155;margin:1em 0 0.35em;text-transform:uppercase;letter-spacing:0.05em">${line.slice(4)}</h3>`);
    } else {
      processed.push(line.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>"));
    }
  }

  let result = "";
  let inPara = false;
  for (const line of processed) {
    const isBlock = /^<h[123]/.test(line);
    if (isBlock) {
      if (inPara) { result += "</p>"; inPara = false; }
      result += line;
    } else if (line.trim() === "") {
      if (inPara) { result += "</p>"; inPara = false; }
    } else {
      if (!inPara) { result += `<p style="margin:0 0 0.65em;line-height:1.75;color:#334155">`; inPara = true; }
      else result += "<br>";
      result += line;
    }
  }
  if (inPara) result += "</p>";
  return result;
}

function highlightText(text: string, clauses: ContractClauseAnalysis[], highlighted: string | null): string {
  let result = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  for (const clause of clauses) {
    const bg = RISK_HIGHLIGHT[clause.risk_level] ?? "#fef9c3";
    const isHighlighted = highlighted === clause.clause_name;
    const style = isHighlighted
      ? `background:${bg};padding:1px 3px;border-radius:3px;outline:2px solid #1e3a5f;`
      : `background:${bg};padding:1px 2px;border-radius:2px;`;
    
    // Use precise positioning if available
    if (clause.char_start !== undefined && clause.char_end !== undefined && clause.full_clause_text) {
      const before = result.slice(0, clause.char_start);
      const clauseText = result.slice(clause.char_start, clause.char_end);
      const after = result.slice(clause.char_end);
      result = before + `<mark data-clause="${escapeAttr(clause.clause_name)}" style="${style}" title="${escapeAttr(clause.clause_name)}">${clauseText}</mark>` + after;
    } 
    // Fallback to regex-based highlighting using start_phrase
    else if (clause.start_phrase) {
      const escaped = clause.start_phrase
        .trim()
        .split(/\s+/)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+");
      try {
        result = result.replace(
          new RegExp(`(${escaped})`, "i"),
          `<mark data-clause="${escapeAttr(clause.clause_name)}" style="${style}" title="${escapeAttr(clause.clause_name)}">$1</mark>`
        );
      } catch { /* bad regex — skip */ }
    }
  }
  return applyDocumentFormatting(result);
}

function ClauseCard({
  clause,
  onAction,
  actionLoading,
  actionResults,
  onHighlight,
  onSendToDraft,
}: {
  clause: ContractClauseAnalysis;
  onAction: (clause: ContractClauseAnalysis, action: typeof CLAUSE_ACTIONS[number]) => void;
  actionLoading: string | null;
  actionResults: Record<string, Record<string, string>>;
  onHighlight: (name: string) => void;
  onSendToDraft: (content: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const results = actionResults[clause.clause_name] ?? {};

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => { setExpanded(!expanded); onHighlight(clause.clause_name); }}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="mt-0.5">{RISK_ICONS[clause.risk_level]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy-950">{clause.clause_name}</p>
            <div className="flex items-center gap-1 shrink-0">
              {clause.defect_type && DEFECT_LABELS[clause.defect_type] && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${DEFECT_LABELS[clause.defect_type].color}`}>
                  {DEFECT_LABELS[clause.defect_type].label}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${RISK_COLORS[clause.risk_level]}`}>
                {clause.risk_level}
              </span>
            </div>
          </div>
          {clause.start_phrase && (
            <p className="text-xs text-slate-500 mt-1 italic truncate">"{clause.start_phrase}..."</p>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Analysis</p>
            <p className="text-xs text-slate-700 leading-relaxed">{clause.analysis}</p>
          </div>

          {clause.redline_suggestion && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">Redline Suggestion</p>
              <p className="text-xs text-red-800 leading-relaxed">{clause.redline_suggestion}</p>
            </div>
          )}

          {clause.standard_alternative && (
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
              <p className="text-xs font-semibold text-teal-700 mb-1">Market Standard</p>
              <p className="text-xs text-teal-800 leading-relaxed">{clause.standard_alternative}</p>
            </div>
          )}

          {/* Per-clause AI actions */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">AI Actions</p>
            <div className="flex flex-wrap gap-1.5">
              {CLAUSE_ACTIONS.map((action) => {
                const key = `${clause.clause_name}:${action.id}`;
                return (
                  <button
                    key={action.id}
                    onClick={() => onAction(clause, action)}
                    disabled={actionLoading === key}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-navy-100 text-slate-600 hover:text-navy-800 text-xs font-medium rounded-md transition-colors disabled:opacity-60"
                  >
                    {actionLoading === key ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action results */}
          {Object.entries(results).map(([actionId, result]) => {
            const action = CLAUSE_ACTIONS.find((a) => a.id === actionId);
            const showDraftBtn = ["rewrite", "mutual", "reduce", "alternative"].includes(actionId);
            return (
              <div key={actionId} className="p-3 bg-navy-50 border border-navy-100 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-navy-700">{action?.label}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(stripMarkdown(result))}
                      className="flex items-center gap-1 text-xs text-navy-500 hover:text-navy-800 font-medium"
                    >
                      <Copy size={10} /> Copy
                    </button>
                    {showDraftBtn && (
                      <button
                        onClick={() => onSendToDraft(result, `${action?.label} — ${clause.clause_name}`)}
                        className="flex items-center gap-1 text-xs text-navy-500 hover:text-navy-800 font-medium"
                      >
                        <ExternalLink size={10} /> Draft
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-navy-900 leading-relaxed whitespace-pre-wrap">{result}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContractReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"input" | "analysis">("input");
  const [inputTab, setInputTab] = useState<"paste" | "upload">("paste");
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState("");
  // Mobile UX State
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"document" | "analysis">("analysis");

  const [documentType, setDocumentType] = useState("commercial");
  const [jurisdiction, setJurisdiction] = useState("Ghana");
  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoaded, setCasesLoaded] = useState(false);
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("overview");
  const [highlightedClause, setHighlightedClause] = useState<string | null>(null);

  // Past reviews
  const [pastReviews, setPastReviews] = useState<ContractAnalysis[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // Per-clause AI actions
  const [clauseActionLoading, setClauseActionLoading] = useState<string | null>(null);
  const [clauseResults, setClauseResults] = useState<Record<string, Record<string, string>>>({});

  // Missing clause generation
  const [generatingClause, setGeneratingClause] = useState<string | null>(null);
  const [generatedClauses, setGeneratedClauses] = useState<Record<string, string>>({});

  // Redlines tab
  const [redlineText, setRedlineText] = useState("");
  const [redlineInputMode, setRedlineInputMode] = useState<"upload" | "paste">("upload");
  const [comparingRedlines, setComparingRedlines] = useState(false);
  const [redlineResult, setRedlineResult] = useState<string | null>(null);
  
  // Redline overlay system
  const [appliedRedlines, setAppliedRedlines] = useState<Set<string>>(new Set());
  const [revisedContractText, setRevisedContractText] = useState<string | null>(null);
  const [redlineModalOpen, setRedlineModalOpen] = useState<string | null>(null);

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);

  // Ref to track step interval for cleanup
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  useEffect(() => {
    if (!user) return;
    loadPastReviews().then(() => {
      // Restore the last viewed analysis on page load
      const lastId = localStorage.getItem("cima_last_review_id");
      if (lastId && !analysis) loadPastAnalysis(lastId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cleanup step interval on unmount
  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
        stepIntervalRef.current = null;
      }
    };
  }, []);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  async function callAiChat(content: string): Promise<string> {
    const token = await getToken();
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ messages: [{ role: "user", content }], context: "review" }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  async function loadCases() {
    if (!user || casesLoaded) return;
    const { data } = await supabase.from("cases").select("id, title, matter_number").eq("user_id", user.id).order("created_at", { ascending: false });
    setCases(data ?? []);
    setCasesLoaded(true);
  }

  async function loadPastReviews() {
    if (!user || reviewsLoaded) return;
    setLoadingReviews(true);
    const { data } = await supabase
      .from("contract_analyses")
      .select("id, overall_risk_score, ai_summary, industry_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setPastReviews((data ?? []) as ContractAnalysis[]);
    setLoadingReviews(false);
    setReviewsLoaded(true);
  }

  async function loadPastAnalysis(id: string) {
    const { data } = await supabase.from("contract_analyses").select("*").eq("id", id).maybeSingle();
    if (!data) return;
    const a = data as ContractAnalysis & {
      negotiation_points?: string[];
      ai_insights?: string;
      detected_parties?: { party_a_name: string; party_b_name: string };
      arbitration_seat?: string;
      arbitration_institution?: string;
      arbitration_improved?: string;
      industry_type?: string;
      revised_contract_text?: string;
      applied_redlines?: string[];
    };
    if (a.industry_type) setDocumentType(a.industry_type);
    
    // Fetch clause actions
    const { data: actionsData } = await supabase.from("contract_clause_actions").select("*").eq("analysis_id", id);
    const loadedClauseResults: Record<string, Record<string, string>> = {};
    const loadedGeneratedClauses: Record<string, string> = {};
    if (actionsData) {
      for (const action of actionsData as { action_id: string; clause_name: string; result_text: string }[]) {
        if (action.action_id === "generate") {
          loadedGeneratedClauses[action.clause_name] = action.result_text;
        } else {
          if (!loadedClauseResults[action.clause_name]) {
            loadedClauseResults[action.clause_name] = {};
          }
          loadedClauseResults[action.clause_name][action.action_id] = action.result_text;
        }
      }
    }

    // Type guard for ContractClauseAnalysis
    const isContractClauseAnalysis = (item: any): item is ContractClauseAnalysis => {
      return item && typeof item.clause_name === 'string' && typeof item.risk_level === 'string';
    };

    // Type guard for MissingClause
    const isMissingClause = (item: any): item is MissingClause => {
      return item && typeof item.clause_type === 'string' && typeof item.importance === 'string';
    };

    // Type guard for obligations
    const isValidObligations = (obj: any): obj is { party_a: string[]; party_b: string[] } => {
      return obj && Array.isArray(obj.party_a) && Array.isArray(obj.party_b);
    };

    setAnalysis({
      id: a.id,
      overall_risk_score: a.overall_risk_score,
      ai_summary: a.ai_summary,
      arbitration_clause_valid: a.arbitration_clause_valid,
      arbitration_clause_issues: a.arbitration_clause_issues,
      arbitration_seat: a.arbitration_seat,
      arbitration_institution: a.arbitration_institution,
      arbitration_improved: a.arbitration_improved,
      governing_law_found: a.governing_law_found,
      governing_law: a.governing_law,
      detected_parties: a.detected_parties,
      clauses: (a.clauses_data ?? []).filter(isContractClauseAnalysis),
      missing_clauses: (a.missing_clauses ?? []).filter(isMissingClause),
      obligations: isValidObligations(a.obligations) ? a.obligations : { party_a: [], party_b: [] },
      recommendations: a.recommendations ?? [],
      negotiation_points: a.negotiation_points,
      ai_insights: a.ai_insights,
      contract_text: a.contract_text ?? "",
    });
    setMode("analysis");
    setActiveTab("overview");
    setHighlightedClause(null);
    setClauseResults(loadedClauseResults);
    setGeneratedClauses(loadedGeneratedClauses);
    setRedlineText("");
    setRedlineResult(null);
    
    // Restore revised contract text and applied redlines if available
    if (a.revised_contract_text && a.applied_redlines) {
      setRevisedContractText(a.revised_contract_text);
      setAppliedRedlines(new Set(a.applied_redlines));
    } else {
      setRevisedContractText(null);
      setAppliedRedlines(new Set());
    }
    
    localStorage.setItem("cima_last_review_id", id);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [".pdf", ".docx", ".txt", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext) && !allowed.includes(file.type)) {
      setError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      e.target.value = "";
      return;
    }
    setError("");
    setFileName(file.name);
    try {
      const text = await extractTextFromFile(file);
      setContractText(text);

      if (user) {
        const fileExt = file.name.split('.').pop() || 'pdf';
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
        if (uploadError) {
          console.error("File upload failed:", uploadError);
          // Continue anyway - document analysis can still work without file storage
        }
        
        const payload: any = {
          user_id: user.id,
          case_id: linkedCaseId || null,
          name: file.name,
          type: "contract",
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || "text/plain",
          extracted_text: text.slice(0, 50000),
          ai_summary: "",
          risk_score: 0,
          status: "ready",
          metadata: {}
        };
        const { data: docData, error: dbError } = await supabase.from("documents").insert(payload).select("id").single();
        
        if (!dbError && docData) {
          setUploadedDocId((docData as { id: string }).id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  }

  async function handleAnalyze() {
    if (!contractText.trim() || !user || analyzing) return;
    setError("");
    setAnalyzing(true);
    setCurrentStep(0);

    stepIntervalRef.current = setInterval(() => {
      setCurrentStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 1800);

    try {
      const token = await getToken();
      const plainText = htmlToPlainText(contractText);
      const res = await fetch(`${supabaseUrl}/functions/v1/contract-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          text: plainText,
          document_id: uploadedDocId || undefined,
          case_id: linkedCaseId || undefined,
          user_id: user.id,
          document_type: documentType,
          jurisdiction,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Analysis failed");
      }

      const data = await res.json() as AnalysisResult;
      setAnalysis(data);
      setMode("analysis");
      setActiveTab("overview");
      setHighlightedClause(null);
      setClauseResults({});
      setGeneratedClauses({});
      setRedlineText("");
      setRedlineResult(null);
      if (data.id) localStorage.setItem("cima_last_review_id", data.id);
      // Refresh past reviews list
      setReviewsLoaded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
        stepIntervalRef.current = null;
      }
      setAnalyzing(false);
      setCurrentStep(0);
    }
  }

  async function handleClauseAction(clause: ContractClauseAnalysis, action: typeof CLAUSE_ACTIONS[number]) {
    const key = `${clause.clause_name}:${action.id}`;
    setClauseActionLoading(key);
    try {
      const clauseText = clause.start_phrase ? `${clause.start_phrase}... [${clause.clause_name}]` : clause.clause_name;
      const result = await callAiChat(`${action.prompt}\n\nClause name: ${clause.clause_name}\nClause text: ${clauseText}\nAnalysis: ${clause.analysis}`);
      setClauseResults((prev) => ({
        ...prev,
        [clause.clause_name]: { ...(prev[clause.clause_name] ?? {}), [action.id]: result },
      }));
      
      if (analysis?.id) {
        const payload: any = {
          analysis_id: analysis.id,
          clause_name: clause.clause_name,
          action_id: action.id,
          result_text: result,
        };
        const { error: saveError } = await supabase.from("contract_clause_actions").upsert(payload, { onConflict: "analysis_id,clause_name,action_id" });
        if (saveError) {
          console.error("Failed to save clause action:", saveError);
          // Continue anyway - result is still displayed to user
        }
      }
    } catch (err) {
      console.error("Clause action failed:", err);
      setError("Failed to perform AI action. Please try again.");
    } finally {
      setClauseActionLoading(null);
    }
  }

  async function generateClause(clause: MissingClause) {
    setGeneratingClause(clause.clause_type);
    try {
      const result = await callAiChat(
        `Draft a complete, professional ${clause.clause_type} clause for inclusion in a commercial contract governed by ${jurisdiction} law.\n\nConsequence of omission: ${clause.consequence_of_omission}\n${clause.suggested_text ? `\nStarting point: ${clause.suggested_text}` : ""}\n\nReturn only the clause text, no preamble.`
      );
      setGeneratedClauses((prev) => ({ ...prev, [clause.clause_type]: result }));
      
      if (analysis?.id) {
        const payload: any = {
          analysis_id: analysis.id,
          clause_name: clause.clause_type,
          action_id: "generate",
          result_text: result,
        };
        await supabase.from("contract_clause_actions").upsert(payload, { onConflict: "analysis_id,clause_name,action_id" });
      }
    } catch (err) {
      console.error("Failed to generate clause:", err);
      setError(err instanceof Error ? err.message : "Failed to generate clause. Please try again.");
    } finally {
      setGeneratingClause(null);
    }
  }

  function handleRedlineClick(clause: ContractClauseAnalysis) {
    setHighlightedClause(clause.clause_name);
    setMobileView("document");
    
    // Scroll to the highlighted clause in document viewer
    setTimeout(() => {
      const element = document.querySelector(`[data-clause="${clause.clause_name}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  function handleOpenRedlineModal(clause: ContractClauseAnalysis) {
    setRedlineModalOpen(clause.clause_name);
  }

  function handleCloseRedlineModal() {
    setRedlineModalOpen(null);
  }

  async function handleApplyRedline(clause: ContractClauseAnalysis) {
    if (!analysis || !clause.redline_suggestion) return;
    
    // Replace the clause text with the suggestion
    const newText = revisedContractText || analysis.contract_text;
    let updatedText = newText;
    
    // Use precise positioning if available
    if (clause.char_start !== undefined && clause.char_end !== undefined) {
      const before = newText.slice(0, clause.char_start);
      const after = newText.slice(clause.char_end);
      updatedText = before + clause.redline_suggestion + after;
    } 
    // Fallback to string replacement using start_phrase
    else if (clause.start_phrase) {
      updatedText = newText.replace(clause.start_phrase, clause.redline_suggestion);
    }
    
    const newAppliedRedlines = new Set([...appliedRedlines, clause.clause_name]);
    
    setRevisedContractText(updatedText);
    setAppliedRedlines(newAppliedRedlines);
    setRedlineModalOpen(null);
    
    // Save to database
    if (analysis.id) {
      try {
        const { error } = await (supabase
          .from("contract_analyses") as any)
          .update({
            revised_contract_text: updatedText,
            applied_redlines: Array.from(newAppliedRedlines),
          })
          .eq("id", analysis.id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to save revised contract:", err);
      }
    }
  }

  function handleRejectRedline(clause: ContractClauseAnalysis) {
    setAppliedRedlines(prev => {
      const newSet = new Set(prev);
      newSet.delete(clause.clause_name);
      return newSet;
    });
    setRedlineModalOpen(null);
  }

  async function handleRedlineCompare() {
    if (!redlineText.trim() || !analysis) return;
    setComparingRedlines(true);
    setRedlineResult(null);
    try {
      const original = analysis.contract_text;
      const revised = redlineText;
      const result = await callAiChat(
        `You are a legal reviewer. Compare these two document versions and identify all changes. Structure your response with these exact headings:\n\n## Added Provisions\n## Deleted Provisions\n## Modified Provisions\n## Risk Changes\n\nFor each item, note the provision name and describe the change. Flag any increase in risk, new liability exposure, or removal of protections prominently.\n\n---ORIGINAL DOCUMENT---\n${original}\n\n---REVISED DOCUMENT---\n${revised}`
      );
      setRedlineResult(result);
    } catch (err) {
      console.error("Redline comparison failed:", err);
      setRedlineResult("Comparison failed. Please try again.");
    } finally {
      setComparingRedlines(false);
    }
  }

  function startNewReview() {
    localStorage.removeItem("cima_last_review_id");
    setMode("input");
    setAnalysis(null);
    setContractText("");
    setFileName("");
    setError("");
    setHighlightedClause(null);
    setClauseResults({});
    setGeneratedClauses({});
    setRedlineText("");
    setRedlineResult(null);
  }

  async function handleExport(fmt: "pdf" | "word") {
    if (!analysis) return;
    setExportOpen(false);
    setError("");
    const title = `Document Review — ${new Date().toLocaleDateString()}`;
    try {
      if (fmt === "word") {
        const content = buildExportMarkdown(analysis);
        await exportToWord(content, title);
      } else {
        await exportToPdf("contract-analysis-report", title);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
    }
  }

  function buildExportMarkdown(a: AnalysisResult): string {
    const lines: string[] = [];
    lines.push(`# Document Review Report`);
    lines.push(`**Risk Score:** ${a.overall_risk_score}/100`);
    if (a.detected_parties?.party_a_name && a.detected_parties?.party_b_name) {
      lines.push(`**Parties:** ${a.detected_parties.party_a_name} / ${a.detected_parties.party_b_name}`);
    }
    lines.push(`**Governing Law:** ${a.governing_law || "Not found"}`);
    lines.push(`**Document Type:** ${DOCUMENT_TYPE_OPTIONS.find((o) => o.value === documentType)?.label ?? documentType}`);
    lines.push(`\n## Executive Summary\n${a.ai_summary}`);
    lines.push(`\n## Clause Analysis`);
    for (const c of a.clauses) {
      lines.push(`\n### ${c.clause_name} [${c.risk_level.toUpperCase()}]`);
      lines.push(c.analysis);
      if (c.redline_suggestion) lines.push(`\n**Redline:** ${c.redline_suggestion}`);
    }
    lines.push(`\n## Missing Clauses`);
    for (const m of a.missing_clauses) {
      lines.push(`\n### ${m.clause_type} [${m.importance.toUpperCase()}]`);
      lines.push(m.consequence_of_omission);
    }
    if (a.detected_parties?.party_a_name && a.detected_parties?.party_b_name) {
      lines.push(`\n## Obligations`);
      lines.push(`**${a.detected_parties.party_a_name}:**`);
      for (const o of a.obligations.party_a) lines.push(`- ${o}`);
      lines.push(`\n**${a.detected_parties.party_b_name}:**`);
      for (const o of a.obligations.party_b) lines.push(`- ${o}`);
    }
    if (a.negotiation_points?.length) {
      lines.push(`\n## Negotiation Points`);
      a.negotiation_points.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
    }
    if (a.ai_insights) {
      lines.push(`\n## AI Insights\n${a.ai_insights}`);
    }
    return lines.join("\n");
  }

  const partyA = analysis?.detected_parties?.party_a_name;
  const partyB = analysis?.detected_parties?.party_b_name;
  const hasParties = !!(partyA && partyB);

  const riskBands = useMemo(() => {
    if (!analysis) return null;
    return {
      critical: analysis.clauses?.filter((c) => c.risk_level === "critical").length ?? 0,
      high: analysis.clauses?.filter((c) => c.risk_level === "high").length ?? 0,
      medium: analysis.clauses?.filter((c) => c.risk_level === "medium").length ?? 0,
      low: analysis.clauses?.filter((c) => c.risk_level === "low").length ?? 0,
    };
  }, [analysis]);

  const riskClauses = useMemo(() => {
    return analysis?.clauses.filter((c) => c.risk_level !== "low") ?? [];
  }, [analysis]);

  const TABS = useMemo(() => {
    if (!analysis) return [];
    return [
      { id: "overview" as AnalysisTab, label: "Overview" },
      { id: "clauses" as AnalysisTab, label: `Clauses (${analysis.clauses?.length ?? 0})` },
      { id: "obligations" as AnalysisTab, label: "Obligations" },
      { id: "risks" as AnalysisTab, label: `Risks (${riskClauses.length})` },
      { id: "missing" as AnalysisTab, label: `Missing (${analysis.missing_clauses?.length ?? 0})` },
      { id: "redlines" as AnalysisTab, label: "Redlines" },
      { id: "arbitration" as AnalysisTab, label: "Arbitration" },
      { id: "ai_insights" as AnalysisTab, label: "AI Insights" },
    ];
  }, [analysis, riskClauses.length]);

  const renderConfigOptions = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Document Type</p>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
        >
          {DOCUMENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Jurisdiction</p>
        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
        >
          {JURISDICTIONS.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Link to Matter</p>
        <select
          value={linkedCaseId}
          onFocus={loadCases}
          onChange={(e) => setLinkedCaseId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
        >
          <option value="">— No matter —</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>{c.title}{c.matter_number ? ` (${c.matter_number})` : ""}</option>
          ))}
        </select>
      </div>

      {/* Past reviews */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Past Reviews</p>
        </div>
        {loadingReviews ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <Loader2 size={11} className="animate-spin" /> Loading...
          </div>
        ) : reviewsLoaded && pastReviews.length === 0 ? (
          <p className="text-xs text-slate-400">No past reviews</p>
        ) : (
          <div className="space-y-1">
            {pastReviews.slice(0, 8).map((r) => (
              <button
                key={r.id}
                onClick={() => { loadPastAnalysis(r.id); setMobileConfigOpen(false); }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${r.overall_risk_score >= 70 ? "bg-red-400" : r.overall_risk_score >= 40 ? "bg-amber-400" : "bg-emerald-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{r.ai_summary?.split(".")[0] || "Review"}</p>
                  <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <ChevronRight size={11} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <Header title="Document Review & Risk Analysis" subtitle="AI review for ambiguity, unenforceable clauses, jurisdictional defects, missing obligations, and liability exposure" />

      {/* Mobile Config Drawer */}
      {mobileConfigOpen && mode === "input" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end md:hidden">
          <div className="w-80 max-w-full bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy-950">Review Settings</h2>
              <button onClick={() => setMobileConfigOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            {renderConfigOptions()}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

        {/* ── LEFT SIDEBAR — hidden on mobile ── */}
        <div className="hidden md:flex w-64 shrink-0 border-r border-slate-200 bg-white flex-col overflow-hidden">
          {mode === "input" ? (
            /* Input controls */
            renderConfigOptions()
          ) : (
            /* Analysis sidebar */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button
                onClick={startNewReview}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus size={13} /> New Review
              </button>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Past Reviews</p>
                {loadingReviews ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 size={11} className="animate-spin" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {pastReviews.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => loadPastAnalysis(r.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors group ${r.id === analysis?.id ? "bg-navy-50 border border-navy-100" : "hover:bg-slate-50"}`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${r.overall_risk_score >= 70 ? "bg-red-400" : r.overall_risk_score >= 40 ? "bg-amber-400" : "bg-emerald-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{r.ai_summary?.split(".")[0] || "Review"}</p>
                          <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER ── */}
        {mode === "input" ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
            <div className="md:hidden flex justify-end mb-4">
              <button 
                onClick={() => setMobileConfigOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-navy-950 shadow-sm"
              >
                <Settings size={14} className="text-slate-500" />
                Review Settings
              </button>
            </div>
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Input tabs */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-100">
                  {(["paste", "upload"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setInputTab(tab)}
                      className={`flex-1 py-3 text-xs font-semibold transition-colors ${inputTab === tab ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {tab === "paste" ? "Paste Document Text" : "Upload File"}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {inputTab === "paste" ? (
                    <RichTextEditor
                      content={contractText}
                      onChange={setContractText}
                      placeholder="Paste the full document text here..."
                    />
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 md:p-10 cursor-pointer hover:border-navy-400 hover:bg-navy-50/30 transition-all">
                      <Upload size={28} className="text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-500">Click to upload a document</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, DOCX, and TXT supported</p>
                      <input type="file" accept=".txt,.docx,.pdf" onChange={handleFileUpload} className="hidden" />
                      {contractText && (
                        <p className="mt-3 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 size={12} className="inline mr-1" />
                         {fileName || "File"}  {/* — {contractText.length.toLocaleString()} characters loaded */}
                        </p>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              {analyzing ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Loader2 size={28} className="text-navy-600 animate-spin mx-auto mb-4" />
                  <p className="text-sm font-semibold text-navy-950 mb-4">Analysing document...</p>
                  <div className="space-y-2 max-w-xs mx-auto">
                    {STEPS.map((step, i) => (
                      <div key={step} className={`flex items-center gap-2.5 text-xs transition-all ${i <= currentStep ? "text-navy-700" : "text-slate-300"}`}>
                        {i < currentStep ? (
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        ) : i === currentStep ? (
                          <Loader2 size={13} className="text-navy-500 animate-spin shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border-2 border-slate-200 shrink-0" />
                        )}
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAnalyze}
                  disabled={!contractText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ClipboardCheck size={16} /> Analyse Document
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Contract viewer (hidden on mobile if analysis mode is active and mobileView is 'analysis') */
          <div className={`flex-1 overflow-y-auto border-r border-slate-200 bg-white ${mobileView === "analysis" ? "hidden md:block" : "block"}`}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-navy-600 shrink-0" />
                <span className="text-xs font-semibold text-navy-950 truncate">
                  {fileName || "Document Text"}
                </span>
                {analysis && (
                  <span className="text-xs text-slate-400 shrink-0">— {analysis.clauses?.length ?? 0} provisions highlighted</span>
                )}
              </div>
            </div>
            <div className="p-6 md:p-10 bg-slate-100 min-h-full" id="contract-text-viewer">
              {analysis && (
                <div className="max-w-[680px] mx-auto bg-white shadow-sm rounded-lg px-10 py-12 border border-slate-200">
                  {revisedContractText && appliedRedlines.size > 0 && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <p className="text-xs font-medium text-emerald-700">
                            {appliedRedlines.size} redline{appliedRedlines.size !== 1 ? 's' : ''} applied
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setRevisedContractText(null);
                            setAppliedRedlines(new Set());
                          }}
                          className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    className="text-sm text-slate-700"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: 1.75 }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(highlightText(revisedContractText || analysis.contract_text, analysis.clauses ?? [], highlightedClause)),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RIGHT ANALYSIS PANEL ── (only in analysis mode) */}
        {mode === "analysis" && analysis && (
          <div className={`w-full md:w-[360px] lg:w-[480px] shrink-0 flex flex-col overflow-hidden bg-slate-50 ${mobileView === "document" ? "hidden md:flex" : "flex"}`} id="contract-analysis-report">
            {/* Mobile View Toggle */}
            <div className="md:hidden flex p-2 bg-white border-b border-slate-200 shrink-0">
              <button
                onClick={() => setMobileView("document")}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${mobileView === "document" ? "bg-navy-50 text-navy-900" : "text-slate-500 hover:bg-slate-50"}`}
              >
                Document
              </button>
              <button
                onClick={() => setMobileView("analysis")}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${mobileView === "analysis" ? "bg-navy-50 text-navy-900" : "text-slate-500 hover:bg-slate-50"}`}
              >
                AI Analysis
              </button>
            </div>

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={14} className="text-navy-600 shrink-0" />
                  <h3 className="text-sm font-bold text-navy-950">AI Analysis</h3>
                </div>
                <div className="flex items-center gap-2">
                  <RiskGauge score={analysis.overall_risk_score} />
                  {/* Export dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setExportOpen((v) => !v)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                    >
                      <Download size={12} /> Export
                    </button>
                    {exportOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                        <button
                          onClick={() => handleExport("pdf")}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <FileText size={11} /> PDF
                        </button>
                        <button
                          onClick={() => handleExport("word")}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <FileText size={11} /> Word (.docx)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex bg-white border-b border-slate-200 overflow-x-auto shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${activeTab === t.id ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {hasParties && (
                      <div className="flex items-start gap-3 p-3">
                        <Users size={13} className="text-navy-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Parties</span>
                        <div className="space-y-0.5 text-right ml-auto">
                          <p className="text-xs font-semibold text-navy-950">{partyA}</p>
                          <p className="text-xs font-semibold text-navy-950">{partyB}</p>
                        </div>
                      </div>
                    )}
                    {analysis.governing_law_found && (
                      <div className="flex items-center gap-3 p-3">
                        <Globe size={13} className="text-navy-400 shrink-0" />
                        <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Governing Law</span>
                        <span className="ml-auto text-xs font-semibold text-navy-950">{analysis.governing_law}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3">
                      <Gavel size={13} className="text-navy-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Dispute Resolution</span>
                      <span className="ml-auto text-xs font-semibold text-navy-950">
                        {analysis.arbitration_clause_valid
                          ? `Arbitration${analysis.arbitration_institution ? ` (${analysis.arbitration_institution})` : ""}`
                          : "Not specified / Issues"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3">
                      <Building2 size={13} className="text-navy-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Doc Type</span>
                      <div className="ml-auto text-right">
                        {analysis.detected_document_type && (
                          <p className="text-xs font-semibold text-navy-950">{analysis.detected_document_type}</p>
                        )}
                        <p className={`text-xs ${analysis.detected_document_type ? "text-slate-400" : "font-semibold text-navy-950"}`}>
                          {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === documentType)?.label ?? documentType}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-navy-950 mb-3">Risk Distribution</p>
                    <div className="flex items-center gap-4">
                      <RiskGauge score={analysis.overall_risk_score} />
                      {riskBands && (
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          {(["critical", "high", "medium", "low"] as const).map((level) => (
                            <div key={level} className={`text-center p-2 rounded-lg border ${RISK_COLORS[level]}`}>
                              <p className="text-sm font-bold">{riskBands[level]}</p>
                              <p className="text-xs capitalize">{level}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={13} className="text-navy-600" />
                      <p className="text-xs font-bold text-navy-950">AI Summary</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{analysis.ai_summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${analysis.arbitration_clause_valid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                      {analysis.arbitration_clause_valid
                        ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        : <XCircle size={14} className="text-red-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">Arbitration</p>
                        <p className="text-xs text-slate-500 truncate">{analysis.arbitration_clause_valid ? "Valid" : (analysis.arbitration_clause_issues || "Issues found")}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${analysis.governing_law_found ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                      {analysis.governing_law_found
                        ? <Scale size={14} className="text-emerald-600 shrink-0" />
                        : <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">Governing Law</p>
                        <p className="text-xs text-slate-500 truncate">{analysis.governing_law || "Not found"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CLAUSES ── */}
              {activeTab === "clauses" && (
                <div className="space-y-3">
                  {analysis.clauses?.map((clause, i) => (
                    <ClauseCard
                      key={i}
                      clause={clause}
                      onAction={handleClauseAction}
                      actionLoading={clauseActionLoading}
                      actionResults={clauseResults}
                      onHighlight={setHighlightedClause}
                      onSendToDraft={(content, name) => navigate("/drafting", { state: { fromDocument: { name, type: "brief", content, summary: "" } } })}
                    />
                  ))}
                </div>
              )}

              {/* ── OBLIGATIONS ── */}
              {activeTab === "obligations" && (
                <div className="space-y-4">
                  {hasParties ? (
                    [
                      { label: partyA, items: analysis.obligations?.party_a ?? [] },
                      { label: partyB, items: analysis.obligations?.party_b ?? [] },
                    ].map(({ label, items }) => (
                      <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-bold text-navy-950 mb-3">{label} — Obligations</p>
                        {items.length === 0 ? (
                          <p className="text-xs text-slate-400">None identified</p>
                        ) : (
                          <ul className="space-y-2">
                            {items.map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Shield size={11} className="text-navy-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-slate-700 leading-relaxed">{item}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold text-navy-950 mb-3">Obligations</p>
                      <p className="text-xs text-slate-400">No parties detected in this document</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── RISKS ── */}
              {activeTab === "risks" && (
                <div className="space-y-3">
                  {(["critical", "high", "medium"] as const).map((level) => {
                    const items = riskClauses.filter((c) => c.risk_level === level);
                    if (items.length === 0) return null;
                    return (
                      <div key={level}>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-2 ${RISK_COLORS[level]}`}>
                          {RISK_ICONS[level]}
                          <span className="text-xs font-bold capitalize">{level} Risk — {items.length} finding{items.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="space-y-2">
                          {items.map((clause, i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-navy-950">{clause.clause_name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border shrink-0 ${RISK_COLORS[clause.risk_level]}`}>
                                  {clause.risk_level}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">{clause.analysis}</p>
                              {clause.redline_suggestion && (
                                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                  <p className="text-xs font-semibold text-orange-700 mb-1">Suggested Change</p>
                                  <p className="text-xs text-orange-800 leading-relaxed">{clause.redline_suggestion}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {riskClauses.length === 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                      <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No significant risks identified</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── MISSING CLAUSES ── */}
              {activeTab === "missing" && (
                <div className="space-y-3">
                  {analysis.missing_clauses?.map((clause, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-navy-950">{clause.clause_type}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border shrink-0 ${RISK_COLORS[clause.importance]}`}>
                          {clause.importance}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{clause.consequence_of_omission}</p>

                      {generatedClauses[clause.clause_type] ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                            <p className="text-xs font-semibold text-teal-700 mb-1.5">Generated Clause</p>
                            <p className="text-xs text-teal-800 leading-relaxed whitespace-pre-wrap">{generatedClauses[clause.clause_type]}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigator.clipboard.writeText(stripMarkdown(generatedClauses[clause.clause_type]))}
                              className="flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-900 font-medium transition-colors"
                            >
                              <Copy size={11} /> Copy
                            </button>
                            <button
                              onClick={() => navigate("/drafting", { state: { fromDocument: { name: `${clause.clause_type} Clause`, type: "brief", content: generatedClauses[clause.clause_type], summary: "" } } })}
                              className="flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-900 font-medium transition-colors"
                            >
                              <ExternalLink size={11} /> Open in Drafting Studio
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateClause(clause)}
                          disabled={generatingClause === clause.clause_type}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                        >
                          {generatingClause === clause.clause_type ? (
                            <><Loader2 size={11} className="animate-spin" /> Generating...</>
                          ) : (
                            <><Bot size={11} /> Generate Clause</>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── REDLINES ── */}
              {activeTab === "redlines" && (
                <div className="space-y-3">
                  {/* Per-clause redlines */}
                  {analysis.clauses?.filter((c) => c.redline_suggestion).length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold text-navy-950 mb-3">Suggested Redlines</p>
                      <div className="space-y-4">
                        {analysis.clauses?.filter((c) => c.redline_suggestion).map((clause, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-slate-600">{clause.clause_name}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${RISK_COLORS[clause.risk_level]}`}>{clause.risk_level}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {clause.start_phrase && (
                                <button
                                  onClick={() => handleRedlineClick(clause)}
                                  className={`p-2 border rounded text-xs text-left transition-colors cursor-pointer ${
                                    appliedRedlines.has(clause.clause_name)
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 line-through opacity-70"
                                      : "bg-red-50 border-red-100 text-red-800 line-through opacity-70 hover:bg-red-100"
                                  }`}
                                  title={appliedRedlines.has(clause.clause_name) ? "Redline applied" : "Click to view in document"}
                                >
                                  {clause.start_phrase}...
                                  {appliedRedlines.has(clause.clause_name) && (
                                    <span className="ml-2 text-emerald-600 font-medium">✓ Applied</span>
                                  )}
                                </button>
                              )}
                              <div className={`p-2 border rounded ${
                                appliedRedlines.has(clause.clause_name)
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-green-50 border-green-200"
                              }`}>
                                <div className="flex items-center justify-between mb-1">
                                  <p className={`text-xs font-medium ${
                                    appliedRedlines.has(clause.clause_name) ? "text-emerald-700" : "text-green-700"
                                  }`}>
                                    {appliedRedlines.has(clause.clause_name) ? "Applied" : "Suggested"}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {!appliedRedlines.has(clause.clause_name) && (
                                      <button onClick={() => handleOpenRedlineModal(clause)} className="text-xs text-green-600 hover:text-green-800" title="Apply this redline">
                                        <CheckCircle2 size={10} />
                                      </button>
                                    )}
                                    <button onClick={() => navigator.clipboard.writeText(stripMarkdown(clause.redline_suggestion!))} className="text-xs text-green-600 hover:text-green-800">
                                      <Copy size={10} />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-green-900 leading-relaxed">{clause.redline_suggestion}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Version compare */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <GitCompare size={13} className="text-navy-600" />
                        <p className="text-xs font-bold text-navy-950">Compare Document Versions</p>
                      </div>
                      {!redlineText && (
                        <div className="flex rounded-md border border-slate-200 overflow-hidden">
                          {(["upload", "paste"] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => setRedlineInputMode(m)}
                              className={`px-2.5 py-1 text-xs font-medium transition-colors ${redlineInputMode === m ? "bg-navy-950 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                            >
                              {m === "upload" ? "Upload" : "Paste"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Provide a revised version to compare against the original.</p>

                    {!redlineText ? (
                      redlineInputMode === "upload" ? (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-navy-400 hover:bg-navy-50/30 transition-all">
                          <Upload size={20} className="text-slate-300 mb-2" />
                          <p className="text-xs font-medium text-slate-500">Upload revised contract (PDF, DOCX, TXT)</p>
                          <input type="file" accept=".txt,.docx,.pdf" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setRedlineText(await extractTextFromFile(file));
                            } catch (err) {
                              console.error("Failed to extract text from file:", err);
                              setError("Failed to read file. Please try again.");
                            }
                            setRedlineResult(null);
                          }} className="hidden" />
                        </label>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            placeholder="Paste the revised contract text here..."
                            className="w-full h-40 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
                            onChange={(e) => { if (e.target.value.trim()) { setRedlineText(e.target.value); setRedlineResult(null); } }}
                          />
                          <p className="text-xs text-slate-400">Start typing or paste text above — the field commits on blur or when you click Compare.</p>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <p className="text-xs text-emerald-700 font-medium">Revised version ready — {redlineText.length.toLocaleString()} chars</p>
                          <button onClick={() => { setRedlineText(""); setRedlineResult(null); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear</button>
                        </div>
                        <button
                          onClick={handleRedlineCompare}
                          disabled={comparingRedlines}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                        >
                          {comparingRedlines ? <><Loader2 size={12} className="animate-spin" /> Comparing...</> : <><GitCompare size={12} /> Compare Versions</>}
                        </button>
                      </div>
                    )}
                  </div>

                  {redlineResult && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={13} className="text-navy-600" />
                        <p className="text-xs font-bold text-navy-950">Comparison Results</p>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed prose prose-xs max-w-none">
                        <ReactMarkdown>{redlineResult}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ARBITRATION ── */}
              {activeTab === "arbitration" && (
                <div className="space-y-3">
                  <div className={`flex items-start gap-3 p-4 rounded-xl border ${analysis.arbitration_clause_valid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    {analysis.arbitration_clause_valid
                      ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      : <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {analysis.arbitration_clause_valid ? "Valid Arbitration Clause" : "Arbitration Clause Issues Found"}
                      </p>
                      {!analysis.arbitration_clause_valid && analysis.arbitration_clause_issues && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{analysis.arbitration_clause_issues}</p>
                      )}
                    </div>
                  </div>

                  {(analysis.arbitration_seat || analysis.arbitration_institution || analysis.governing_law) && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold text-navy-950 mb-3">Clause Details</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Seat", value: analysis.arbitration_seat },
                          { label: "Institution", value: analysis.arbitration_institution },
                          { label: "Governing Law", value: analysis.governing_law },
                          { label: "Enforceability", value: analysis.arbitration_clause_valid ? "Enforceable" : "Issues present" },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
                            <p className="text-xs font-semibold text-navy-950">{value || "Not specified"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.arbitration_improved && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-navy-950">Suggested Improved Wording</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(stripMarkdown(analysis.arbitration_improved!))}
                            className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 font-medium"
                          >
                            <Copy size={11} /> Copy
                          </button>
                          <button
                            onClick={() => navigate("/drafting", { state: { fromDocument: { name: "Improved Arbitration Clause", type: "brief", content: analysis.arbitration_improved!, summary: "" } } })}
                            className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 font-medium"
                          >
                            <ExternalLink size={11} /> Open in Drafting Studio
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                        <p className="text-xs text-teal-800 leading-relaxed whitespace-pre-wrap">{analysis.arbitration_improved}</p>
                      </div>
                    </div>
                  )}

                  {!analysis.arbitration_clause_valid && !analysis.arbitration_clause_issues && !analysis.arbitration_seat && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                      <Info size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No arbitration clause detected</p>
                      <p className="text-xs text-slate-400 mt-1">Consider adding a dispute resolution clause.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── AI INSIGHTS ── */}
              {activeTab === "ai_insights" && (
                <div className="space-y-3">
                  {analysis.ai_insights ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={13} className="text-navy-600" />
                        <p className="text-xs font-bold text-navy-950">Senior Associate Review</p>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed prose prose-xs max-w-none">
                        <ReactMarkdown>{analysis.ai_insights}</ReactMarkdown>
                      </div>
                    </div>
                  ) : null}

                  {analysis.negotiation_points && analysis.negotiation_points.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Scale size={13} className="text-navy-600" />
                        <p className="text-xs font-bold text-navy-950">Negotiation Points</p>
                      </div>
                      <ul className="space-y-2">
                        {analysis.negotiation_points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-navy-100 text-navy-700 text-xs font-bold shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{point}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <p className="text-xs font-bold text-navy-950">Recommendations</p>
                      </div>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Shield size={11} className="text-navy-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-700 leading-relaxed">{rec}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!analysis.ai_insights && !analysis.negotiation_points?.length && !analysis.recommendations?.length && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                      <Info size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">No insights available</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Redline Modal */}
      {redlineModalOpen && analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCloseRedlineModal}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-navy-950">Apply Redline</h2>
              <button 
                onClick={handleCloseRedlineModal}
                className="p-1 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(() => {
                const clause = analysis.clauses?.find(c => c.clause_name === redlineModalOpen);
                if (!clause) return null;
                
                return (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-navy-950 mb-2">{clause.clause_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${RISK_COLORS[clause.risk_level]}`}>
                        {clause.risk_level} Risk
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2">Original Text</p>
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-xs text-red-800 leading-relaxed whitespace-pre-wrap">
                            {clause.full_clause_text || (clause.start_phrase ? `${clause.start_phrase}...` : "Original text not available")}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-2">Suggested Replacement</p>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-900 leading-relaxed whitespace-pre-wrap">
                            {clause.redline_suggestion}
                          </p>
                        </div>
                      </div>

                      {clause.analysis && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Analysis</p>
                          <p className="text-xs text-slate-700 leading-relaxed">{clause.analysis}</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={handleCloseRedlineModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const clause = analysis.clauses?.find(c => c.clause_name === redlineModalOpen);
                  if (clause) handleRejectRedline(clause);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  const clause = analysis.clauses?.find(c => c.clause_name === redlineModalOpen);
                  if (clause) handleApplyRedline(clause);
                }}
                className="px-4 py-2 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Apply Redline
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
