import { useEffect, useState } from "react";
import { Plus, Calendar, Sparkles, Loader2, Check, X, AlertCircle, ClipboardList } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { callCaseAI, buildProceduralCalendarPrompt, parseProceduralCalendarLines, type CaseContext, type SuggestedDeadline } from "../caseAI";
import { logCaseEvent } from "../../../lib/caseEvents";

type Deadline = {
  id: string;
  title: string;
  due_date: string;
  type?: string;
  status?: string;
  notes?: string;
};

export default function DeadlinesTab({ caseId, caseData }: { caseId: string; caseData?: CaseContext }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "", type: "filing", notes: "" });
  const [saving, setSaving] = useState(false);

  // AI Procedural Calendar
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedDeadline[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [importing, setImporting] = useState(false);
  const [calendarError, setCalendarError] = useState("");

  // Compliance Checklist
  const [checklistItems, setChecklistItems] = useState<{ label: string; category: string; checked: boolean }[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    supabase.from("deadlines").select("*").eq("case_id", caseId).order("due_date", { ascending: true })
      .then(({ data }) => { setDeadlines(data ?? []); setLoading(false); });
  }, [caseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.from("deadlines")
      .insert({ ...form, case_id: caseId, user_id: user!.id, status: "pending" })
      .select().maybeSingle();
    if (error) {
      showToast(`Failed to add deadline: ${error.message}`, "error");
    } else if (data) {
      setDeadlines(p => [...p, data].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      logCaseEvent(caseId, user!.id, "deadline_added", `Deadline added: "${data.title}" due ${data.due_date}`);
    }
    setForm({ title: "", due_date: "", type: "filing", notes: "" });
    setShowForm(false);
    setSaving(false);
  }

  async function generateCalendar() {
    if (!caseData) return;
    setCalendarLoading(true);
    setCalendarError("");
    setSuggested([]);
    setShowCalendar(true);

    const prompt = buildProceduralCalendarPrompt(caseData as CaseContext & { status?: string }, deadlines);

    try {
      const raw = await callCaseAI(caseData, prompt);
      const parsed = parseProceduralCalendarLines(raw);
      if (parsed.length === 0) {
        setCalendarError("Could not parse procedural steps. Try again or add deadlines manually.");
      }
      setSuggested(parsed);
    } catch {
      setCalendarError("Failed to generate calendar. Please try again.");
    } finally {
      setCalendarLoading(false);
    }
  }

  async function importSelected() {
    const toImport = suggested.filter(s => s.selected);
    if (toImport.length === 0) return;
    setImporting(true);
    const { data, error } = await supabase.from("deadlines").insert(
      toImport.map(s => ({
        case_id: caseId,
        user_id: user!.id,
        title: s.title,
        due_date: s.due_date,
        type: s.type,
        notes: s.notes,
        status: "pending",
      }))
    ).select();
    if (error) {
      showToast(`Failed to import deadlines: ${error.message}`, "error");
    } else if (data) {
      setDeadlines(p => [...p, ...data].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      setSuggested([]);
      setShowCalendar(false);
    }
    setImporting(false);
  }

  async function generateChecklist() {
    if (!caseData) return;
    setChecklistLoading(true);
    setChecklistItems([]);
    setShowChecklist(true);
    const prompt = `Generate a procedural compliance checklist for a ${caseData.type} proceeding governed by ${caseData.framework ?? "Ghana ADR Act 2010 (Act 798)"}.

List ALL mandatory procedural steps that must be completed, in the order they should occur. For each step output EXACTLY this format (one per line):
ITEM|<step description>|<category: Filing/Notice/Appointment/Pleadings/Disclosure/Hearing/Award/Post-Award>

Include steps such as: serving notice, constituting the tribunal, filing statements of claim/defence, document disclosure, witness statement exchange, expert report exchange, pre-hearing conference, main hearing, post-hearing submissions, award delivery, cost submissions. Be comprehensive — include ALL steps required under the rules.

Output ONLY the ITEM lines — no explanation, no headers, no other text.`;
    try {
      const raw = await callCaseAI(caseData, prompt);
      const items = raw.split("\n").filter(l => l.startsWith("ITEM|")).map(line => {
        const parts = line.split("|");
        return { label: parts[1]?.trim() ?? "Step", category: parts[2]?.trim() ?? "Procedure", checked: false };
      }).filter(i => i.label);
      setChecklistItems(items);
    } catch {
      setChecklistItems([{ label: "Failed to generate checklist. Please try again.", category: "Error", checked: false }]);
    } finally {
      setChecklistLoading(false);
    }
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading deadlines...</div>;

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-slate-400">{deadlines.filter(d => d.status !== "completed").length} pending</p>
        <div className="flex flex-wrap gap-2">
          {caseData && (
            <>
              <button onClick={generateChecklist} disabled={checklistLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 border border-navy-700 text-emerald-400 hover:border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                {checklistLoading ? <Loader2 size={13} className="animate-spin" /> : <ClipboardList size={13} />}Checklist
              </button>
              <button onClick={generateCalendar} disabled={calendarLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 border border-navy-700 text-gold-400 hover:border-gold-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                {calendarLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}AI Calendar
              </button>
            </>
          )}
          <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
            <Plus size={13} />Add Deadline
          </button>
        </div>
      </div>

      {/* AI Procedural Calendar suggestions */}
      {showCalendar && (
        <div className="bg-navy-800/50 border border-gold-500/15 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gold-500/10">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-gold-400" />
              <span className="text-xs font-semibold text-gold-400">AI Procedural Calendar</span>
            </div>
            <button onClick={() => setShowCalendar(false)} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
          </div>
          <div className="p-4 space-y-3">
            {calendarLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                <Loader2 size={14} className="animate-spin" />Generating procedural calendar...
              </div>
            ) : calendarError ? (
              <div className="flex items-center gap-2 text-xs text-red-400 p-2 bg-red-500/10 rounded-lg">
                <AlertCircle size={12} />{calendarError}
              </div>
            ) : suggested.length > 0 ? (
              <>
                <p className="text-xs text-slate-400">{suggested.filter(s => s.selected).length} of {suggested.length} steps selected. Uncheck any to skip.</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {suggested.map((s, i) => (
                    <label key={i} className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${s.selected ? "bg-navy-900/60" : "opacity-50"}`}>
                      <input type="checkbox" checked={s.selected} onChange={e => setSuggested(p => p.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                        className="mt-0.5 shrink-0 accent-gold-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-white">{s.title}</span>
                          <span className="text-xs text-slate-500 font-mono">{new Date(s.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span className="text-xs text-slate-600 capitalize">{s.type}</span>
                        </div>
                        {s.notes && <p className="text-xs text-slate-500 mt-0.5">{s.notes}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={importSelected} disabled={importing || suggested.filter(s => s.selected).length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50">
                    {importing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Import {suggested.filter(s => s.selected).length} Deadline{suggested.filter(s => s.selected).length !== 1 ? "s" : ""}
                  </button>
                  <button onClick={() => setSuggested(p => p.map(s => ({ ...s, selected: true })))}
                    className="px-3 py-2 text-xs text-slate-400 hover:text-white border border-navy-600 rounded-lg transition-colors">Select All</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Compliance Checklist */}
      {showChecklist && (
        <div className="bg-navy-800/50 border border-emerald-500/15 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/10">
            <div className="flex items-center gap-2">
              <ClipboardList size={13} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Procedural Compliance Checklist</span>
            </div>
            <div className="flex items-center gap-3">
              {checklistItems.length > 0 && (
                <span className="text-xs text-slate-400">{checklistItems.filter(i => i.checked).length}/{checklistItems.length} done</span>
              )}
              <button onClick={() => setShowChecklist(false)} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
            </div>
          </div>
          <div className="p-4">
            {checklistLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                <Loader2 size={14} className="animate-spin" />Generating compliance checklist...
              </div>
            ) : checklistItems.length > 0 ? (
              <div className="space-y-0.5 max-h-80 overflow-y-auto">
                {(() => {
                  let lastCat = "";
                  return checklistItems.map((item, i) => {
                    const showCat = item.category !== lastCat;
                    lastCat = item.category;
                    return (
                      <div key={i}>
                        {showCat && (
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 pt-3 pb-1 first:pt-0">{item.category}</p>
                        )}
                        <label className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-navy-900/40 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${item.checked ? "bg-emerald-500 border-emerald-500" : "border-slate-600 group-hover:border-emerald-500/50"}`}
                            onClick={() => setChecklistItems(p => p.map((x, j) => j === i ? { ...x, checked: !x.checked } : x))}>
                            {item.checked && <Check size={10} className="text-white" />}
                          </div>
                          <span className={`text-xs leading-relaxed ${item.checked ? "line-through text-slate-500" : "text-slate-300"}`}>{item.label}</span>
                        </label>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={add} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Deadline title..." required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {["filing","hearing","response","submission","other"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)"
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.title || !form.due_date} className="bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold px-4 py-2 hover:bg-gold-400 disabled:opacity-50">{saving ? "..." : "Add"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 border border-navy-600 text-slate-400 rounded-lg text-xs hover:bg-navy-800">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {deadlines.map(d => {
          const due = new Date(d.due_date);
          const overdue = due < today && d.status !== "completed";
          return (
            <div key={d.id} className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border ${d.status === "completed" ? "border-navy-800 opacity-60" : overdue ? "border-red-500/30 bg-red-500/5" : "border-navy-700 bg-navy-800/30"}`}>
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${overdue ? "bg-red-500/15" : "bg-navy-700"}`}>
                <span className={`text-xs font-bold ${overdue ? "text-red-400" : "text-gold-400"}`}>{due.toLocaleDateString("en", { month: "short" }).toUpperCase()}</span>
                <span className={`text-lg font-bold leading-none ${overdue ? "text-red-400" : "text-white"}`}>{due.getDate()}</span>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${d.status === "completed" ? "line-through text-slate-500" : "text-white"}`}>{d.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {overdue && <span className="text-xs text-red-400 font-medium">Overdue</span>}
                  {d.type && <span className="text-xs text-slate-500 capitalize">{d.type}</span>}
                  {d.notes && <span className="text-xs text-slate-600">{d.notes}</span>}
                </div>
              </div>
              <button onClick={async () => {
                const next = d.status === "completed" ? "pending" : "completed";
                const { error } = await supabase.from("deadlines").update({ status: next }).eq("id", d.id);
                if (error) { showToast(`Failed to update deadline: ${error.message}`, "error"); return; }
                setDeadlines(p => p.map(x => x.id === d.id ? { ...x, status: next } : x));
                if (next === "completed") logCaseEvent(caseId, user!.id, "deadline_completed", `Deadline completed: "${d.title}"`);
              }} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${d.status === "completed" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-navy-600 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400"}`}>
                {d.status === "completed" ? "Done" : "Mark Done"}
              </button>
            </div>
          );
        })}
        {deadlines.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={32} className="mx-auto mb-3 text-slate-700" />
            <p className="text-sm text-slate-500">No deadlines recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
