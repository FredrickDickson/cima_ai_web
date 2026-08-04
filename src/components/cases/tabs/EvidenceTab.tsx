import { useEffect, useState } from "react";
import { Plus, Loader2, Sparkles, ChevronDown, ChevronUp, Layers, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { callCaseAI, type CaseContext } from "../caseAI";
import { logCaseEvent } from "../../../lib/caseEvents";

type Evidence = {
  id: string;
  title: string;
  type?: string;
  summary?: string;
  created_at: string;
};

type Issue = { id: string; issue_number: number; description: string };
type EvidenceLink = { id: string; issue_id: string };

const TYPE_COLORS: Record<string, string> = {
  documentary: "bg-blue-500/10 text-blue-400",
  testimonial: "bg-purple-500/10 text-purple-400",
  digital: "bg-cyan-500/10 text-cyan-400",
  physical: "bg-amber-500/10 text-amber-400",
};

export default function EvidenceTab({ caseId, caseData }: { caseId: string; caseData: CaseContext }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Evidence[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "documentary", summary: "" });
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiAction, setAiAction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [links, setLinks] = useState<Record<string, EvidenceLink[]>>({});

  useEffect(() => {
    Promise.all([
      supabase.from("evidence").select("*").eq("case_id", caseId).order("created_at", { ascending: false }),
      supabase.from("issues").select("id, issue_number, description").eq("case_id", caseId).order("issue_number"),
    ]).then(([evRes, issRes]) => {
      setItems(evRes.data ?? []);
      setIssues(issRes.data ?? []);
      setLoading(false);
    });
  }, [caseId]);

  useEffect(() => {
    if (items.length === 0) { setLinks({}); return; }
    supabase.from("evidence_issues").select("id, evidence_id, issue_id").in("evidence_id", items.map(i => i.id))
      .then(({ data }) => {
        const grouped: Record<string, EvidenceLink[]> = {};
        for (const row of (data ?? []) as { id: string; evidence_id: string; issue_id: string }[]) {
          (grouped[row.evidence_id] ??= []).push({ id: row.id, issue_id: row.issue_id });
        }
        setLinks(grouped);
      });
  }, [items]);

  async function linkIssue(evidenceId: string, issueId: string) {
    const { data, error } = await supabase.from("evidence_issues")
      .insert({ evidence_id: evidenceId, issue_id: issueId, user_id: user!.id })
      .select().maybeSingle();
    if (error) { showToast(`Failed to link issue: ${error.message}`, "error"); return; }
    if (data) setLinks(p => ({ ...p, [evidenceId]: [...(p[evidenceId] ?? []), { id: data.id, issue_id: data.issue_id }] }));
  }

  async function unlinkIssue(evidenceId: string, linkId: string) {
    const { error } = await supabase.from("evidence_issues").delete().eq("id", linkId);
    if (error) { showToast(`Failed to unlink issue: ${error.message}`, "error"); return; }
    setLinks(p => ({ ...p, [evidenceId]: (p[evidenceId] ?? []).filter(l => l.id !== linkId) }));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.from("evidence").insert({ ...form, case_id: caseId, user_id: user!.id }).select().maybeSingle();
    if (error) {
      showToast(`Failed to add evidence: ${error.message}`, "error");
    } else if (data) {
      setItems(p => [data, ...p]);
      logCaseEvent(caseId, user!.id, "evidence_added", `Evidence added: "${data.title}"`);
    }
    setForm({ title: "", type: "documentary", summary: "" });
    setShowForm(false);
    setSaving(false);
  }

  const evidenceList = items.map(e => `- ${e.title} (${e.type ?? "unknown"})${e.summary ? `: ${e.summary}` : ""}`).join("\n");
  const issueList = issues.map((i, n) => `${n + 1}. ${i.description}`).join("\n");

  async function runAI(action: string, prompt: string) {
    setAiAction(action);
    setAiResult("");
    setAiLoading(true);
    setShowAI(true);
    const extraCtx = `\nIssues:\n${issueList || "None recorded."}\n\nEvidence:\n${evidenceList || "None recorded."}`;
    const result = await callCaseAI(caseData, prompt, extraCtx);
    setAiResult(result);
    setAiLoading(false);
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading evidence...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{items.length} items</p>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button onClick={() => setShowAI(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 border border-navy-700 text-gold-400 hover:border-gold-500/30 rounded-lg text-xs font-semibold transition-colors">
              <Sparkles size={13} />{showAI ? "Hide AI" : "AI Analysis"}
            </button>
          )}
          <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
            <Plus size={13} />Add Evidence
          </button>
        </div>
      </div>

      {/* AI Action Panel */}
      {showAI && (
        <div className="bg-navy-800/50 border border-gold-500/15 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gold-400 flex items-center gap-1.5"><Sparkles size={12} />Evidence AI Actions</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => runAI("Find Contradictions", `Analyse the evidence items in this case for contradictions, inconsistencies, or conflicts. For each contradiction found, identify the conflicting evidence items and explain the significance for the case.`)}
              disabled={aiLoading} className="text-xs px-3 py-1.5 rounded-lg border border-navy-600 text-slate-300 hover:text-white hover:border-gold-500/30 transition-colors disabled:opacity-50">
              Find Contradictions
            </button>
            <button onClick={() => runAI("Group by Issue", `Map each evidence item to the most relevant case issue. Present as a table or structured list showing: Issue → Supporting Evidence → Opposing Evidence. Be specific about which evidence strengthens or weakens each issue.`)}
              disabled={aiLoading} className="text-xs px-3 py-1.5 rounded-lg border border-navy-600 text-slate-300 hover:text-white hover:border-gold-500/30 transition-colors disabled:opacity-50">
              Group by Issue
            </button>
            <button onClick={() => runAI("Identify Missing Evidence", `Based on the legal issues in this case and the evidence collected so far, identify what additional evidence would be most valuable. For each gap, explain what it would prove and where it might be found.`)}
              disabled={aiLoading} className="text-xs px-3 py-1.5 rounded-lg border border-navy-600 text-slate-300 hover:text-white hover:border-gold-500/30 transition-colors disabled:opacity-50">
              Identify Missing Evidence
            </button>
          </div>
          {aiLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 size={14} className="animate-spin" />Analysing evidence...
            </div>
          )}
          {aiResult && (
            <div className="bg-navy-900/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gold-400 mb-2">{aiAction}</p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{aiResult}</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={add} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Evidence title..." required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {["documentary","testimonial","digital","physical"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} placeholder="Description / summary..." rows={2}
            className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.title} className="bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold px-4 py-2 hover:bg-gold-400 disabled:opacity-50">{saving ? "..." : "Add"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 border border-navy-600 text-slate-400 rounded-lg text-xs hover:bg-navy-800">Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Layers size={32} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-500">No evidence recorded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-white leading-snug">{item.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[item.type ?? ""] ?? "bg-slate-500/10 text-slate-400"}`}>{item.type}</span>
              </div>
              {item.summary && <p className="text-xs text-slate-400 line-clamp-3">{item.summary}</p>}
              <p className="text-xs text-slate-600 mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-navy-800">
                {(links[item.id] ?? []).map(link => {
                  const iss = issues.find(i => i.id === link.issue_id);
                  return (
                    <span key={link.id} className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-navy-800 border border-navy-700 rounded text-slate-400">
                      Issue #{iss?.issue_number ?? "?"}
                      <button onClick={() => unlinkIssue(item.id, link.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                        <X size={9} />
                      </button>
                    </span>
                  );
                })}
                {issues.filter(i => !(links[item.id] ?? []).some(l => l.issue_id === i.id)).length > 0 && (
                  <select
                    value=""
                    onChange={e => { if (e.target.value) linkIssue(item.id, e.target.value); }}
                    className="text-xs bg-navy-900 border border-navy-700 rounded px-1.5 py-0.5 text-slate-500 focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="">+ Supports issue...</option>
                    {issues.filter(i => !(links[item.id] ?? []).some(l => l.issue_id === i.id)).map(i => (
                      <option key={i.id} value={i.id}>#{i.issue_number} {i.description.slice(0, 30)}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
