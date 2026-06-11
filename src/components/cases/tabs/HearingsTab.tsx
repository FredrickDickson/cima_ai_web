import { useEffect, useState } from "react";
import { Plus, MapPin, Calendar, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { callCaseAI, type CaseContext } from "../caseAI";

type Hearing = {
  id: string;
  title: string;
  scheduled_at: string;
  location?: string;
  type?: string;
  notes?: string;
  status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  adjourned: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const HEARING_TYPES = ["preliminary", "substantive", "award", "procedural"];

const AI_ACTIONS = [
  { label: "Generate Hearing Brief", prompt: (h: Hearing) => `Generate a concise hearing brief for the upcoming ${h.type ?? ""} hearing titled "${h.title}" scheduled for ${new Date(h.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Cover: key issues to address, evidence to present, procedural points, and opening remarks outline.` },
  { label: "Suggest Witness Questions", prompt: (h: Hearing) => `Based on the issues and evidence in this case, suggest examination-in-chief and cross-examination questions for the "${h.title}" hearing on ${new Date(h.scheduled_at).toLocaleDateString("en-GB")}.` },
  { label: "Generate Hearing Summary", prompt: (h: Hearing) => `Generate a post-hearing summary template for "${h.title}" held on ${new Date(h.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Include sections: Attendance, Matters Discussed, Decisions Made, Action Items, Next Steps.` },
];

export default function HearingsTab({ caseId, caseData }: { caseId: string; caseData: CaseContext }) {
  const { user } = useAuth();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", scheduled_at: "", location: "", type: "preliminary", notes: "" });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("hearings").select("*").eq("case_id", caseId).order("scheduled_at", { ascending: true })
      .then(({ data }) => { setHearings(data ?? []); setLoading(false); });
  }, [caseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data } = await supabase.from("hearings").insert({
      ...form,
      case_id: caseId,
      user_id: user!.id,
      status: "scheduled",
    }).select().maybeSingle();
    if (data) setHearings(p => [...p, data].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
    setForm({ title: "", scheduled_at: "", location: "", type: "preliminary", notes: "" });
    setShowForm(false);
    setSaving(false);
  }

  async function runAI(hearing: Hearing, actionIndex: number) {
    const key = `${hearing.id}-${actionIndex}`;
    setAiLoading(key);
    try {
      const result = await callCaseAI(caseData, AI_ACTIONS[actionIndex].prompt(hearing));
      setAiResults(p => ({ ...p, [key]: result }));
    } finally {
      setAiLoading(null);
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("hearings").update({ status }).eq("id", id);
    setHearings(p => p.map(h => h.id === id ? { ...h, status } : h));
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading hearings...</div>;

  const upcoming = hearings.filter(h => h.status === "scheduled");
  const past = hearings.filter(h => h.status !== "scheduled");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{upcoming.length} upcoming · {past.length} past</p>
        <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
          <Plus size={13} />Add Hearing
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Hearing title..." required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Location / Virtual link"
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {HEARING_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes / agenda..." rows={2}
            className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.title || !form.scheduled_at} className="bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold px-4 py-2 hover:bg-gold-400 disabled:opacity-50">{saving ? "..." : "Add"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 border border-navy-600 text-slate-400 rounded-lg text-xs hover:bg-navy-800">Cancel</button>
          </div>
        </form>
      )}

      {hearings.length === 0 && (
        <div className="text-center py-12">
          <Calendar size={32} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-500">No hearings scheduled yet.</p>
        </div>
      )}

      {[{ label: "Upcoming", items: upcoming }, { label: "Past", items: past }].map(group =>
        group.items.length > 0 && (
          <div key={group.label}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{group.label}</p>
            <div className="space-y-2">
              {group.items.map(h => {
                const date = new Date(h.scheduled_at);
                const isExpanded = expanded === h.id;
                return (
                  <div key={h.id} className="border border-navy-700 rounded-xl overflow-hidden">
                    <button onClick={() => setExpanded(p => p === h.id ? null : h.id)} className="w-full flex items-start gap-4 p-4 hover:bg-navy-800/30 transition-colors text-left">
                      <div className="w-12 h-12 rounded-xl bg-navy-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-gold-400">{date.toLocaleDateString("en", { month: "short" }).toUpperCase()}</span>
                        <span className="text-lg font-bold text-white leading-none">{date.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{h.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[h.status] ?? STATUS_COLORS.scheduled}`}>{h.status}</span>
                          {h.type && <span className="text-xs text-slate-500 capitalize">{h.type}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400">{date.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</span>
                          {h.location && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={10} />{h.location}</span>}
                        </div>
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-navy-800">
                        {h.notes && (
                          <div className="pt-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                            <p className="text-sm text-slate-300">{h.notes}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {h.status === "scheduled" && (
                            <>
                              <button onClick={() => updateStatus(h.id, "completed")} className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors">Mark Completed</button>
                              <button onClick={() => updateStatus(h.id, "adjourned")} className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-navy-800 transition-colors">Mark Adjourned</button>
                            </>
                          )}
                          {AI_ACTIONS.map((action, i) => {
                            const key = `${h.id}-${i}`;
                            return (
                              <button key={i} onClick={() => runAI(h, i)} disabled={!!aiLoading}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gold-500/20 text-gold-400 hover:bg-gold-500/10 transition-colors disabled:opacity-50">
                                {aiLoading === key ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                        {AI_ACTIONS.map((_, i) => {
                          const key = `${h.id}-${i}`;
                          return aiResults[key] ? (
                            <div key={key} className="bg-navy-900/50 border border-gold-500/15 rounded-lg p-3">
                              <p className="text-xs font-semibold text-gold-400 mb-2 flex items-center gap-1.5"><Sparkles size={11} />{AI_ACTIONS[i].label}</p>
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
          </div>
        )
      )}
    </div>
  );
}
