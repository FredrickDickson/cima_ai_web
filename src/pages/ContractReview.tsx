import { useState } from "react";
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
  Briefcase,
  Bot,
  Copy,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { ContractClauseAnalysis, MissingClause, Case } from "../types/database";

interface AnalysisResult {
  id?: string;
  overall_risk_score: number;
  ai_summary: string;
  arbitration_clause_valid: boolean;
  arbitration_clause_issues: string;
  governing_law_found: boolean;
  governing_law: string;
  clauses: ContractClauseAnalysis[];
  missing_clauses: MissingClause[];
  obligations: { party_a: string[]; party_b: string[] };
  recommendations: string[];
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

type AnalysisTab = "clauses" | "missing" | "obligations" | "recommendations";
type InputTab = "paste" | "upload";

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

function highlightText(text: string, clauses: ContractClauseAnalysis[]): string {
  let highlighted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const clause of clauses) {
    if (!clause.start_phrase) continue;
    const escaped = clause.start_phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const colorMap: Record<string, string> = {
      critical: "#fee2e2",
      high: "#ffedd5",
      medium: "#fef9c3",
      low: "#d1fae5",
    };
    const bg = colorMap[clause.risk_level] ?? "#fef9c3";
    try {
      highlighted = highlighted.replace(
        new RegExp(escaped, "i"),
        `<mark style="background:${bg};padding:1px 2px;border-radius:2px" title="${escapeAttr(clause.clause_name)}">$&</mark>`
      );
    } catch { /* bad regex — skip */ }
  }
  return highlighted;
}

function ClauseCard({ clause }: { clause: ContractClauseAnalysis }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="mt-0.5">{RISK_ICONS[clause.risk_level]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy-950">{clause.clause_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border shrink-0 ${RISK_COLORS[clause.risk_level]}`}>
              {clause.risk_level}
            </span>
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
        </div>
      )}
    </div>
  );
}

const STEPS = ["Parsing text", "Identifying clauses", "Risk scoring", "Checking compliance", "Generating report"];

export default function ContractReview() {
  const { user } = useAuth();
  const [inputTab, setInputTab] = useState<InputTab>("paste");
  const [contractText, setContractText] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [casesLoaded, setCasesLoaded] = useState(false);
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("clauses");
  const [generatingClause, setGeneratingClause] = useState<string | null>(null);
  const [generatedClauses, setGeneratedClauses] = useState<Record<string, string>>({});

  async function loadCases() {
    if (!user || casesLoaded) return;
    const { data } = await supabase.from("cases").select("id, title, matter_number").eq("user_id", user.id).order("created_at", { ascending: false });
    setCases(data ?? []);
    setCasesLoaded(true);
  }

  async function handleAnalyze() {
    if (!contractText.trim() || !user) return;
    setError("");
    setAnalyzing(true);
    setCurrentStep(0);
    setAnalysis(null);

    const stepInterval = setInterval(() => {
      setCurrentStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 1800);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${supabaseUrl}/functions/v1/contract-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          text: contractText,
          case_id: linkedCaseId || undefined,
          user_id: user.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      clearInterval(stepInterval);
      setAnalyzing(false);
      setCurrentStep(0);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContractText(text);
  }

  async function generateClause(clause: MissingClause) {
    setGeneratingClause(clause.clause_type);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Draft a complete, professional ${clause.clause_type} clause suitable for inclusion in a commercial contract. Consequence of omission: ${clause.consequence_of_omission}. If a suggested text was provided, use it as a starting point and enhance it: ${clause.suggested_text || "N/A"}. Return only the clause text, no preamble.`,
          }],
          context: "drafting",
        }),
      });
      const data = await res.json();
      const generated = data.choices?.[0]?.message?.content ?? "";
      setGeneratedClauses((prev) => ({ ...prev, [clause.clause_type]: generated }));
    } catch { /* ignore */ } finally {
      setGeneratingClause(null);
    }
  }

  const riskBands = analysis
    ? {
        critical: analysis.clauses.filter((c) => c.risk_level === "critical").length,
        high: analysis.clauses.filter((c) => c.risk_level === "high").length,
        medium: analysis.clauses.filter((c) => c.risk_level === "medium").length,
        low: analysis.clauses.filter((c) => c.risk_level === "low").length,
      }
    : null;

  return (
    <AppLayout>
      <Header title="Contract Review" subtitle="AI-powered clause analysis, risk scoring, and redline suggestions" />

      <div className="flex-1 overflow-hidden flex flex-col">
        {!analysis ? (
          /* Input Section */
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Input tabs */}
                <div className="flex border-b border-slate-100">
                  {(["paste", "upload"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setInputTab(tab)}
                      className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors ${inputTab === tab ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {tab === "paste" ? "Paste Contract Text" : "Upload File"}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {inputTab === "paste" ? (
                    <textarea
                      value={contractText}
                      onChange={(e) => setContractText(e.target.value)}
                      rows={12}
                      placeholder="Paste the full contract text here..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none font-mono leading-relaxed"
                    />
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:border-navy-400 hover:bg-navy-50/30 transition-all">
                      <Upload size={28} className="text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-500">Click to upload a contract file</p>
                      <p className="text-xs text-slate-400 mt-1">TXT files supported</p>
                      <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                      {contractText && (
                        <p className="mt-3 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 size={12} className="inline mr-1" />
                          {contractText.length.toLocaleString()} characters loaded
                        </p>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Case link */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-navy-600" />
                  <p className="text-sm font-semibold text-navy-950">Link to Matter (optional)</p>
                </div>
                <select
                  value={linkedCaseId}
                  onFocus={loadCases}
                  onChange={(e) => setLinkedCaseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-navy-950 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                >
                  <option value="">— No matter —</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}{c.matter_number ? ` (${c.matter_number})` : ""}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              {analyzing ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Loader2 size={28} className="text-navy-600 animate-spin mx-auto mb-4" />
                  <p className="text-sm font-semibold text-navy-950 mb-4">Analysing contract...</p>
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
                  <ClipboardCheck size={16} />
                  Analyse Contract
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Results — split view */
          <div className="flex-1 overflow-hidden flex">
            {/* Contract Viewer */}
            <div className="flex-1 overflow-y-auto border-r border-slate-200 bg-white">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-navy-600" />
                  <span className="text-xs font-semibold text-navy-950">Contract Text</span>
                  <span className="text-xs text-slate-400">— {analysis.clauses.length} clauses highlighted</span>
                </div>
                <button
                  onClick={() => { setAnalysis(null); setContractText(""); }}
                  className="text-xs text-navy-600 hover:text-navy-900 font-medium transition-colors"
                >
                  New Review
                </button>
              </div>
              <div className="p-6">
                <div
                  className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono"
                  dangerouslySetInnerHTML={{ __html: highlightText(analysis.contract_text, analysis.clauses) }}
                />
              </div>
            </div>

            {/* Analysis Panel */}
            <div className="w-[480px] flex flex-col overflow-hidden bg-slate-50 shrink-0">
              {/* Summary header */}
              <div className="bg-white border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-navy-600" />
                    <h3 className="text-sm font-bold text-navy-950">AI Analysis Report</h3>
                  </div>
                  <RiskGauge score={analysis.overall_risk_score} />
                </div>

                {/* Risk bands */}
                {riskBands && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {(["critical", "high", "medium", "low"] as const).map((level) => (
                      <div key={level} className={`text-center p-2 rounded-lg border ${RISK_COLORS[level]}`}>
                        <p className="text-base font-bold">{riskBands[level]}</p>
                        <p className="text-xs capitalize">{level}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed">{analysis.ai_summary}</p>

                {/* Clause validity cards */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${analysis.arbitration_clause_valid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    {analysis.arbitration_clause_valid ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> : <XCircle size={13} className="text-red-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">Arbitration Clause</p>
                      <p className="text-xs text-slate-500 truncate">{analysis.arbitration_clause_valid ? "Valid" : (analysis.arbitration_clause_issues || "Issues found")}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${analysis.governing_law_found ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                    {analysis.governing_law_found ? <Scale size={13} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">Governing Law</p>
                      <p className="text-xs text-slate-500 truncate">{analysis.governing_law || "Not found"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-white border-b border-slate-200 overflow-x-auto">
                {([
                  { id: "clauses", label: `Clauses (${analysis.clauses.length})` },
                  { id: "missing", label: `Missing (${analysis.missing_clauses.length})` },
                  { id: "obligations", label: "Obligations" },
                  { id: "recommendations", label: "Advice" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${activeTab === t.id ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeTab === "clauses" && analysis.clauses.map((clause, i) => (
                  <ClauseCard key={i} clause={clause} />
                ))}

                {activeTab === "missing" && analysis.missing_clauses.map((clause, i) => (
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
                        <button
                          onClick={() => navigator.clipboard.writeText(generatedClauses[clause.clause_type])}
                          className="flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-900 font-medium transition-colors"
                        >
                          <Copy size={11} /> Copy clause
                        </button>
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

                {activeTab === "obligations" && (
                  <div className="space-y-4">
                    {[
                      { label: "Party A", items: analysis.obligations.party_a },
                      { label: "Party B", items: analysis.obligations.party_b },
                    ].map(({ label, items }) => (
                      <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-bold text-navy-950 mb-3">{label} Obligations</p>
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
                    ))}
                  </div>
                )}

                {activeTab === "recommendations" && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-navy-950 mb-3">AI Recommendations</p>
                    <ul className="space-y-3">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-navy-100 text-navy-700 text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
