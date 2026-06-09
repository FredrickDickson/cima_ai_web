import { useEffect, useState } from "react";
import { Plus, CheckCircle2, ChevronDown, Loader2, Sparkles, ShieldAlert } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { callCaseAI, type CaseContext } from "../caseAI";

type Issue = {
  id: string;
  issue_number: number;
  description: string;
  claimant_position?: string;
  respondent_position?: string;
  status: string;
  created_at: string;
};

export default function IssuesTab({ caseId, caseData }: { caseId: string; caseData: CaseContext }) {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", claimant_position: "", respondent_position: "" });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState("");
  const [aiAction, setAiAction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    supabase.from("issues").select("*").eq("case_id", caseId).order("issue_number", { ascending: true })
      .then(({ data }) => { setIssues(data ?? []); setLoading(false); });
  }, [caseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data } = await supabase.from("issues").insert({
      ...form, case_id: caseId, user_id: user!.id, status: "open",
      issue_number: (issues.length + 1),
    }).select().maybeSingle();
    if (data) setIssues(p => [...p, data]);
    setForm({ description: "", claimant_position: "", respondent_position: "" });
    setShowForm(false);
    setSaving(false);
  }

  async function toggleStatus(issue: Issue) {
    const next = issue.status === "open" ? "resolved" : "open";
    await supabase.from("issues").update({ status: next }).eq("id", issue.id);
    setIssues(p => p.map(i => i.id === issue.id ? { ...i, status: next } : i));
  }

  const issueList = issues.map(i => `${i.issue_number}. ${i.description}${i.claimant_position ? ` [Claimant: ${i.claimant_position}]` : ""}${i.respondent_position ? ` [Respondent: ${i.respondent_position}]` : ""}`).join("\n");

  async function runAI(action: string, prompt: string) {
    setAiAction(action);
    setAiResult("");
    setAiLoading(true);
    setShowAI(true);
    const extraCtx = `\nCurrent issues:\n${issueList || "None recorded yet."}`;
    const result = await callCaseAI(caseData, prompt, extraCtx);
    setAiResult(result);
    setAiLoading(false);
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading issues...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{issues.filter(i => i.status === "open").length} open / {issues.length} total</p>
        <div className="flex gap-2">
          <button onClick={() => setShowAI(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 border border-navy-700 text-gold-400 hover:border-gold-500/30 rounded-lg text-xs font-semibold transition-colors">
            <Sparkles size={13} />{showAI ? "Hide AI" : "AI Actions"}
          </button>
          <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
            <Plus size={13} />Add Issue
          </button>
        </div>
      </div>

      {/* AI Actions Panel */}
      {showAI && (
        <div className="bg-navy-800/50 border border-gold-500/15 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gold-400 flex items-center gap-1.5"><Sparkles size={12} />Issue AI Actions</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => runAI("Suggest Issues", `Based on the case description, type, and framework, suggest additional legal issues that should be raised that are not already listed. Explain why each issue is legally significant and which party it favours.`)}
              disabled={aiLoading} className="text-xs px-3 py-1.5 rounded-lg border border-navy-600 text-slate-300 hover:text-white hover:border-gold-500/30 transition-colors disabled:opacity-50">
              Suggest Issues
            </button>
            <button onClick={() => runAI("Analyse Issue Strengths", `For each issue listed, assess the legal strength of each party's position on a scale of Strong / Moderate / Weak. Explain the reasoning and suggest what evidence or authorities would strengthen the weaker positions.`)}
              disabled={aiLoading || issues.length === 0} className="text-xs px-3 py-1.5 rounded-lg border border-navy-600 text-slate-300 hover:text-white hover:border-gold-500/30 transition-colors disabled:opacity-50">
              Analyse Strengths
            </button>
            <button onClick={() => runAI("Prioritise Issues", `Rank the issues in order of importance to the outcome of this case. Explain which issues are threshold/jurisdictional issues that must be resolved first, and which are likely to be determinative of the final outcome.`)}
              disabled={aiLoading || issues.length === 0} className="text-xs px-3 py-1.5 rounded-lg border border-navy-600 text-slate-300 hover:text-white hover:border-gold-500/30 transition-colors disabled:opacity-50">
              Prioritise Issues
            </button>
          </div>
          {aiLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 size={14} className="animate-spin" />Analysing...
            </div>
          )}
          {aiResult && (
            <div className="bg-navy-900/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gold-400 mb-2 flex items-center gap-1.5"><ShieldAlert size={11} />{aiAction}</p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{aiResult}</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={add} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Issue description..." required rows={2}
            className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50" />
          <div className="grid grid-cols-2 gap-3">
            <textarea value={form.claimant_position} onChange={e => setForm(p => ({ ...p, claimant_position: e.target.value }))} placeholder="Claimant position..." rows={2}
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50" />
            <textarea value={form.respondent_position} onChange={e => setForm(p => ({ ...p, respondent_position: e.target.value }))} placeholder="Respondent position..." rows={2}
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.description} className="bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold px-4 py-2 hover:bg-gold-400 disabled:opacity-50">{saving ? "..." : "Add"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 border border-navy-600 text-slate-400 rounded-lg text-xs hover:bg-navy-800">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {issues.map(issue => (
          <div key={issue.id} className={`border rounded-xl overflow-hidden transition-colors ${issue.status === "resolved" ? "border-navy-800 opacity-60" : "border-navy-700"}`}>
            <button onClick={() => setExpanded(p => p === issue.id ? null : issue.id)} className="w-full flex items-start gap-3 p-4 hover:bg-navy-800/30 transition-colors text-left">
              <button onClick={e => { e.stopPropagation(); toggleStatus(issue); }} className="mt-0.5 shrink-0">
                {issue.status === "resolved"
                  ? <CheckCircle2 size={16} className="text-emerald-400" />
                  : <div className="w-4 h-4 rounded-full border-2 border-slate-600 hover:border-gold-500 transition-colors" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gold-500/70">#{issue.issue_number}</span>
                  <span className={`text-sm font-medium ${issue.status === "resolved" ? "line-through text-slate-500" : "text-white"}`}>{issue.description}</span>
                </div>
              </div>
              <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform mt-1 ${expanded === issue.id ? "rotate-180" : ""}`} />
            </button>
            {expanded === issue.id && (issue.claimant_position || issue.respondent_position) && (
              <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                {issue.claimant_position && (
                  <div className="bg-gold-500/5 border border-gold-500/15 rounded-lg p-3">
                    <p className="text-xs font-medium text-gold-400 mb-1">Claimant Position</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{issue.claimant_position}</p>
                  </div>
                )}
                {issue.respondent_position && (
                  <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3">
                    <p className="text-xs font-medium text-red-400 mb-1">Respondent Position</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{issue.respondent_position}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {issues.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No issues recorded yet.</p>}
      </div>
    </div>
  );
}
