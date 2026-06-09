import { useEffect, useState } from "react";
import {
  Zap, Scale, AlertTriangle, Lightbulb, ArrowRight,
  Loader2, RefreshCw, Sparkles, CheckSquare,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { callCaseAI, type CaseContext } from "../caseAI";

type Case = CaseContext & { status: string; framework?: string };

type InsightResult = { label: string; content: string } | null;

const STRUCTURED_ACTIONS = [
  {
    id: "strength",
    label: "Case Strength Assessment",
    icon: Scale,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    bgColor: "bg-emerald-500/5",
    prompt: (c: Case, extra: string) =>
      `Conduct a case strength assessment for "${c.title}". Rate the overall strength of each party's position on a scale of 1-10 and explain your reasoning. Consider: (1) legal merits under ${c.framework || "applicable law"}, (2) available evidence, (3) procedural position, (4) likely outcome range. Be specific and practical.\n${extra}`,
  },
  {
    id: "risks",
    label: "Risk Analysis",
    icon: AlertTriangle,
    color: "text-red-400",
    borderColor: "border-red-500/20",
    bgColor: "bg-red-500/5",
    prompt: (c: Case, extra: string) =>
      `Identify and rate all significant risks for "${c.title}". For each risk: (1) rate it HIGH / MEDIUM / LOW, (2) explain the risk, (3) suggest a mitigation step. Cover: legal risks, procedural risks, evidentiary gaps, deadline risks, and strategic vulnerabilities.\n${extra}`,
  },
  {
    id: "strategy",
    label: "Strategy Recommendations",
    icon: Lightbulb,
    color: "text-gold-400",
    borderColor: "border-gold-500/20",
    bgColor: "bg-gold-500/5",
    prompt: (c: Case, extra: string) =>
      `Recommend a comprehensive legal strategy for "${c.title}". Address: (1) primary litigation/arbitration strategy, (2) evidence strategy, (3) procedural tactics, (4) settlement prospects and negotiation leverage, (5) witness preparation priorities. Be specific and actionable.\n${extra}`,
  },
  {
    id: "nextsteps",
    label: "Next Steps",
    icon: CheckSquare,
    color: "text-blue-400",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
    prompt: (c: Case, extra: string) =>
      `What are the most important immediate next steps for "${c.title}"? Consider: upcoming deadlines, required filings, evidence to gather, experts to instruct, witnesses to prepare, and procedural applications to make. Present as a prioritised action list.\n${extra}`,
  },
];

export default function AIInsightsTab({ caseData }: { caseData: Case }) {
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [insights, setInsights] = useState<Record<string, InsightResult>>({});
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);
  const [extraCtx, setExtraCtx] = useState("");

  const parties: { name: string; role: string }[] = Array.isArray(caseData.parties) ? caseData.parties : [];

  // Load issues and evidence for richer context
  useEffect(() => {
    Promise.all([
      supabase.from("issues").select("description, claimant_position, respondent_position").eq("case_id", caseData.id).order("issue_number"),
      supabase.from("evidence").select("title, type, summary").eq("case_id", caseData.id).limit(10),
      supabase.from("deadlines").select("title, due_date, status").eq("case_id", caseData.id).neq("status", "completed").order("due_date").limit(5),
    ]).then(([issRes, evRes, dlRes]) => {
      const issues = issRes.data ?? [];
      const evidence = evRes.data ?? [];
      const deadlines = dlRes.data ?? [];
      const ctx: string[] = [];
      if (issues.length > 0) ctx.push(`Issues:\n${issues.map((i, n) => `${n + 1}. ${i.description}`).join("\n")}`);
      if (evidence.length > 0) ctx.push(`Evidence:\n${evidence.map(e => `- ${e.title} (${e.type})`).join("\n")}`);
      if (deadlines.length > 0) ctx.push(`Upcoming Deadlines:\n${deadlines.map(d => `- ${d.title}: ${new Date(d.due_date).toLocaleDateString("en-GB")}`).join("\n")}`);
      setExtraCtx(ctx.join("\n\n"));
    });
  }, [caseData.id]);

  async function runInsight(actionId: string) {
    const action = STRUCTURED_ACTIONS.find(a => a.id === actionId);
    if (!action) return;
    setLoadingInsight(actionId);
    const result = await callCaseAI(caseData, action.prompt(caseData, extraCtx));
    setInsights(p => ({ ...p, [actionId]: { label: action.label, content: result } }));
    setLoadingInsight(null);
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setChatLoading(true);
    const q = question;
    setQuestion("");
    const result = await callCaseAI(caseData, q, extraCtx);
    setHistory(p => [{ q, a: result }, ...p].slice(0, 8));
    setChatLoading(false);
  }

  const chatPrompts = [
    "What are the strongest arguments for our side?",
    "How would an arbitral tribunal likely view this case?",
    "What are the prospects of a jurisdictional challenge?",
    "Suggest negotiation talking points",
    "What precedents are most relevant?",
    "Draft key talking points for the next hearing",
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-navy-800/30 border border-gold-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-gold-400" />
          <span className="text-sm font-semibold text-gold-400">AI Case Intelligence</span>
        </div>
        <p className="text-xs text-slate-400">Full matter context loaded — parties, issues, evidence, and deadlines inform every analysis.</p>
      </div>

      {/* Structured Analysis Actions */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">One-Click Analysis</p>
        <div className="grid grid-cols-2 gap-3">
          {STRUCTURED_ACTIONS.map(action => {
            const result = insights[action.id];
            const isLoading = loadingInsight === action.id;
            return (
              <div key={action.id} className={`border rounded-xl overflow-hidden ${result ? action.borderColor : "border-navy-700"}`}>
                <button
                  onClick={() => runInsight(action.id)}
                  disabled={!!loadingInsight}
                  className={`w-full flex items-center gap-2.5 p-3.5 transition-colors text-left ${result ? action.bgColor : "hover:bg-navy-800/30"}`}
                >
                  <action.icon size={15} className={action.color} />
                  <span className={`text-xs font-semibold flex-1 ${result ? action.color : "text-slate-300"}`}>{action.label}</span>
                  {isLoading ? (
                    <Loader2 size={13} className="text-slate-400 animate-spin shrink-0" />
                  ) : (
                    <RefreshCw size={13} className={`shrink-0 ${result ? action.color : "text-slate-600"}`} title={result ? "Regenerate" : "Run"} />
                  )}
                </button>
                {isLoading && (
                  <div className="px-4 py-3 border-t border-navy-800">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 size={12} className="animate-spin" />Analysing...
                    </div>
                  </div>
                )}
                {result && !isLoading && (
                  <div className="px-4 py-3 border-t border-navy-800/50">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">{result.content}</p>
                    {result.content.length > 400 && (
                      <button className="text-xs text-gold-400 hover:text-gold-300 mt-2 transition-colors">Show more</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Interface */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Ask About This Case</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {chatPrompts.map(p => (
            <button key={p} onClick={() => setQuestion(p)}
              className="text-xs px-3 py-1.5 bg-navy-800/50 border border-navy-700 text-slate-400 hover:text-white hover:border-gold-500/30 rounded-lg transition-colors">
              {p}
            </button>
          ))}
        </div>

        <form onSubmit={ask} className="flex gap-2">
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask anything about this case..."
            className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
          <button type="submit" disabled={!question.trim() || chatLoading}
            className="px-4 py-3 bg-gold-500 text-navy-950 rounded-xl hover:bg-gold-400 transition-colors disabled:opacity-50">
            {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
        </form>
      </div>

      {chatLoading && (
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4 flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
          <span className="text-sm">Analysing case...</span>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conversation History</p>
          {history.map((h, i) => (
            <div key={i} className="border border-navy-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-navy-800/50 border-b border-navy-700">
                <div className="flex items-center gap-2">
                  <Sparkles size={11} className="text-gold-400" />
                  <p className="text-xs text-slate-300 font-medium">{h.q}</p>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-5">{h.a}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

