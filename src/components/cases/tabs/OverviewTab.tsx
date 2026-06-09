import { useEffect, useState } from "react";
import {
  Users, BookOpen, Calendar, FileText, ShieldAlert,
  AlertTriangle, Loader2, Sparkles, PenTool, Search, Scale,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { callCaseAI, type CaseContext } from "../caseAI";

type Case = CaseContext & {
  status: string;
  framework?: string;
  next_hearing?: string;
  created_at: string;
};

interface OverviewTabProps {
  caseData: Case;
  onTabChange: (tab: string) => void;
}

export default function OverviewTab({ caseData, onTabChange }: OverviewTabProps) {
  const parties: { name: string; role: string }[] = Array.isArray(caseData.parties) ? caseData.parties : [];

  const [deadlines, setDeadlines] = useState<{ id: string; title: string; due_date: string; status?: string }[]>([]);
  const [docs, setDocs] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [issueCount, setIssueCount] = useState(0);
  const [aiSummary, setAiSummary] = useState("");
  const [aiRisks, setAiRisks] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRisks, setLoadingRisks] = useState(false);

  useEffect(() => {
    supabase.from("deadlines").select("id, title, due_date, status").eq("case_id", caseData.id)
      .neq("status", "completed").order("due_date", { ascending: true }).limit(5)
      .then(({ data }) => setDeadlines(data ?? []));

    supabase.from("documents").select("id, name, created_at").eq("case_id", caseData.id)
      .order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => setDocs(data ?? []));

    supabase.from("issues").select("id", { count: "exact" }).eq("case_id", caseData.id).eq("status", "open")
      .then(({ count }) => setIssueCount(count ?? 0));
  }, [caseData.id]);

  async function generateSummary() {
    setLoadingSummary(true);
    const result = await callCaseAI(
      caseData,
      `Generate a concise 3-paragraph executive matter summary for ${caseData.title}. Cover: (1) Nature of the dispute and key facts, (2) Core legal issues and each party's position, (3) Current procedural status and strategic outlook. Write in plain professional language suitable for a client briefing.`
    );
    setAiSummary(result);
    setLoadingSummary(false);
  }

  async function analyzeRisks() {
    setLoadingRisks(true);
    const result = await callCaseAI(
      caseData,
      `Conduct a risk analysis for ${caseData.title}. Identify: (1) Legal risks in the current position, (2) Procedural risks, (3) Evidentiary gaps, (4) Potential weaknesses the opposing party may exploit, (5) Deadline or compliance risks. For each risk, rate it HIGH / MEDIUM / LOW and suggest a mitigation step. Be concise and practical.`
    );
    setAiRisks(result);
    setLoadingRisks(false);
  }

  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Status", value: caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1), color: "text-emerald-400" },
          { label: "Type", value: caseData.type.charAt(0).toUpperCase() + caseData.type.slice(1), color: "text-gold-400" },
          { label: "Framework", value: caseData.framework || "—", color: "text-blue-400" },
        ].map(item => (
          <div key={item.label} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className={`text-sm font-bold ${item.color} truncate`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onTabChange("drafts")} className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 border border-gold-500/20 text-gold-400 hover:bg-gold-500/20 rounded-lg text-xs font-semibold transition-colors">
          <PenTool size={13} />Generate Document
        </button>
        <button onClick={() => onTabChange("research")} className="flex items-center gap-2 px-4 py-2 bg-navy-800/60 border border-navy-700 text-slate-300 hover:text-white hover:border-gold-500/30 rounded-lg text-xs font-semibold transition-colors">
          <Search size={13} />Research
        </button>
        <button onClick={() => onTabChange("ai")} className="flex items-center gap-2 px-4 py-2 bg-navy-800/60 border border-navy-700 text-slate-300 hover:text-white hover:border-gold-500/30 rounded-lg text-xs font-semibold transition-colors">
          <Scale size={13} />AI Insights
        </button>
      </div>

      {/* 2-column widget grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Parties */}
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Users size={13} className="text-gold-400" />Parties</h3>
          {parties.length === 0 ? (
            <p className="text-xs text-slate-500">No parties recorded.</p>
          ) : (
            <div className="space-y-2.5">
              {parties.map((p, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${i === 0 ? "bg-gold-500/10 text-gold-400" : "bg-red-500/10 text-red-400"}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{p.role}</p>
                    <p className="text-sm text-white leading-tight">{p.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><BookOpen size={13} className="text-gold-400" />Details</h3>
          <div className="space-y-2 text-sm">
            {[
              ["Matter No.", caseData.matter_number],
              ["Opened", new Date(caseData.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
              ["Next Hearing", caseData.next_hearing ? new Date(caseData.next_hearing).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null],
              ["Open Issues", issueCount > 0 ? `${issueCount} open` : null],
            ].map(([k, v]) => v && (
              <div key={String(k)} className="flex justify-between">
                <span className="text-xs text-slate-500">{k}</span>
                <span className="text-xs text-slate-300 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Calendar size={13} className="text-gold-400" />Upcoming Deadlines
          </h3>
          {deadlines.length === 0 ? (
            <p className="text-xs text-slate-500">No pending deadlines.</p>
          ) : (
            <div className="space-y-2">
              {deadlines.map(d => {
                const due = new Date(d.due_date);
                const overdue = due < today;
                return (
                  <div key={d.id} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${overdue ? "bg-red-400" : "bg-gold-400"}`} />
                    <p className="text-xs text-slate-300 flex-1 truncate">{d.title}</p>
                    <span className={`text-xs font-medium shrink-0 ${overdue ? "text-red-400" : "text-slate-500"}`}>{due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => onTabChange("timeline")} className="text-xs text-gold-400 hover:text-gold-300 mt-3 block transition-colors">View all →</button>
        </div>

        {/* Recent Documents */}
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText size={13} className="text-gold-400" />Recent Documents
          </h3>
          {docs.length === 0 ? (
            <p className="text-xs text-slate-500">No documents linked.</p>
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-2">
                  <FileText size={11} className="text-slate-500 shrink-0" />
                  <p className="text-xs text-slate-300 flex-1 truncate">{d.name}</p>
                  <span className="text-xs text-slate-600 shrink-0">{new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onTabChange("documents")} className="text-xs text-gold-400 hover:text-gold-300 mt-3 block transition-colors">View all →</button>
        </div>
      </div>

      {/* Description */}
      {caseData.description && (
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{caseData.description}</p>
        </div>
      )}

      {/* AI Matter Summary */}
      <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles size={13} className="text-gold-400" />AI Matter Summary
          </h3>
          <button onClick={generateSummary} disabled={loadingSummary}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gold-500/10 border border-gold-500/20 text-gold-400 hover:bg-gold-500/20 rounded-lg transition-colors disabled:opacity-50">
            {loadingSummary ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {aiSummary ? "Regenerate" : "Generate Summary"}
          </button>
        </div>
        {loadingSummary ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <Loader2 size={14} className="animate-spin" />Generating summary...
          </div>
        ) : aiSummary ? (
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
        ) : (
          <p className="text-xs text-slate-500">Click "Generate Summary" for an AI-powered overview of this matter.</p>
        )}
      </div>

      {/* AI Risk Alerts */}
      <div className="bg-navy-800/30 border border-red-500/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-red-400" />Risk Alerts
          </h3>
          <button onClick={analyzeRisks} disabled={loadingRisks}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50">
            {loadingRisks ? <Loader2 size={11} className="animate-spin" /> : <ShieldAlert size={11} />}
            {aiRisks ? "Re-analyse" : "Analyse Risks"}
          </button>
        </div>
        {loadingRisks ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <Loader2 size={14} className="animate-spin" />Analysing risks...
          </div>
        ) : aiRisks ? (
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiRisks}</p>
        ) : (
          <p className="text-xs text-slate-500">Click "Analyse Risks" to identify case risks, evidentiary gaps, and strategic vulnerabilities.</p>
        )}
      </div>
    </div>
  );
}
