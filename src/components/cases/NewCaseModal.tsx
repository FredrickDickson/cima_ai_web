import { useState } from "react";
import { X, AlertCircle, AlertTriangle, Sparkles, Loader2, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { callCaseAI, buildProceduralCalendarPrompt, parseProceduralCalendarLines, type SuggestedDeadline } from "./caseAI";

type Case = {
  id: string;
  title: string;
  matter_number: string;
  type: string;
  status: string;
  framework: string;
  description: string;
  parties: { name: string; role: string }[];
  next_hearing?: string;
  created_at: string;
};

const CASE_TYPES = ["arbitration", "litigation", "mediation", "advisory", "transactional"];
const FRAMEWORKS = [
  "", "Ghana ADR Act 2010", "ICC Rules", "UNCITRAL Rules",
  "LCIA Rules", "New York Convention", "AFSA Rules", "Ad Hoc",
];

function findPartyConflicts(name: string, existingCases: Case[]): string[] {
  const q = name.trim().toLowerCase();
  if (q.length < 3) return [];
  const matches: string[] = [];
  for (const c of existingCases) {
    const parties = Array.isArray(c.parties) ? c.parties : [];
    if (parties.some(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()))) {
      matches.push(c.title);
    }
  }
  return matches;
}

export default function NewCaseModal({
  onClose,
  onCreated,
  existingCases = [],
}: {
  onClose: () => void;
  onCreated: (c: Case) => void;
  existingCases?: Case[];
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", matter_number: "", type: "arbitration", framework: "",
    description: "", claimant: "", respondent: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 2 — optional AI-generated procedural calendar, offered right after
  // the matter is created (only when a framework was selected).
  const [step, setStep] = useState<"form" | "calendar">("form");
  const [createdCase, setCreatedCase] = useState<Case | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [suggested, setSuggested] = useState<SuggestedDeadline[]>([]);
  const [importing, setImporting] = useState(false);

  const claimantConflicts = findPartyConflicts(form.claimant, existingCases);
  const respondentConflicts = findPartyConflicts(form.respondent, existingCases);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const parties = [];
    if (form.claimant) parties.push({ name: form.claimant, role: "Claimant" });
    if (form.respondent) parties.push({ name: form.respondent, role: "Respondent" });
    const { data, error: err } = await supabase
      .from("cases")
      .insert({
        user_id: user!.id,
        title: form.title,
        matter_number: form.matter_number,
        type: form.type,
        framework: form.framework,
        description: form.description,
        parties,
        status: "active",
      })
      .select()
      .maybeSingle();
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (!data) return;
    if (data.framework) {
      setCreatedCase(data);
      setStep("calendar");
    } else {
      onCreated(data);
    }
  }

  async function generateCalendar() {
    if (!createdCase) return;
    setCalendarLoading(true);
    setCalendarError("");
    try {
      const prompt = buildProceduralCalendarPrompt(createdCase, []);
      const raw = await callCaseAI(createdCase, prompt);
      const parsed = parseProceduralCalendarLines(raw);
      if (parsed.length === 0) setCalendarError("Could not parse procedural steps. You can skip and add deadlines manually.");
      setSuggested(parsed);
    } catch {
      setCalendarError("Failed to generate calendar. You can skip and add deadlines manually.");
    } finally {
      setCalendarLoading(false);
    }
  }

  async function importAndContinue() {
    if (!createdCase) return;
    const toImport = suggested.filter(s => s.selected);
    if (toImport.length === 0) { onCreated(createdCase); return; }
    setImporting(true);
    await supabase.from("deadlines").insert(
      toImport.map(s => ({
        case_id: createdCase.id,
        user_id: user!.id,
        title: s.title,
        due_date: s.due_date,
        type: s.type,
        notes: s.notes,
        status: "pending",
      })),
    );
    setImporting(false);
    onCreated(createdCase);
  }

  if (step === "calendar" && createdCase) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
        <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl my-4 sm:my-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
            <div>
              <h2 className="text-white font-semibold">Generate Procedural Calendar?</h2>
              <p className="text-xs text-slate-500 mt-0.5">{createdCase.title}</p>
            </div>
            <button onClick={() => onCreated(createdCase)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {suggested.length === 0 ? (
              <>
                <p className="text-sm text-slate-400">
                  Generate an AI-suggested set of procedural deadlines (filings, disclosure, hearings, awards) based on{" "}
                  <span className="text-slate-300 font-medium">{createdCase.framework}</span>, so this matter doesn't start with an empty calendar.
                </p>
                {calendarError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                    <AlertCircle size={13} className="shrink-0" />{calendarError}
                  </div>
                )}
                <button
                  onClick={generateCalendar}
                  disabled={calendarLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500/20 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {calendarLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {calendarLoading ? "Generating..." : "Generate Procedural Calendar"}
                </button>
              </>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {suggested.map((s, i) => (
                  <label key={i} className="flex items-start gap-2.5 p-2.5 bg-navy-800/50 border border-navy-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={() => setSuggested(p => p.map((x, xi) => xi === i ? { ...x, selected: !x.selected } : x))}
                      className="mt-0.5 accent-gold-500"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.due_date} · {s.type}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-navy-800">
            <button
              type="button"
              onClick={() => onCreated(createdCase)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-navy-700 text-slate-300 text-sm hover:bg-navy-800 transition-colors"
            >
              Skip
            </button>
            {suggested.length > 0 && (
              <button
                type="button"
                onClick={importAndContinue}
                disabled={importing}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gold-500 text-navy-950 font-semibold text-sm hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Add {suggested.filter(s => s.selected).length} & Continue
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl my-4 sm:my-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
          <h2 className="text-white font-semibold">New Matter</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              <AlertCircle size={13} className="shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Matter Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              required
              placeholder="e.g. Acme Corp v. Delta Industries"
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50"
              >
                {CASE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Matter Number</label>
              <input
                value={form.matter_number}
                onChange={e => setForm(p => ({ ...p, matter_number: e.target.value }))}
                placeholder="ARB/2025/001"
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Framework / Rules</label>
            <select
              value={form.framework}
              onChange={e => setForm(p => ({ ...p, framework: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50"
            >
              {FRAMEWORKS.map(f => <option key={f} value={f}>{f || "— Select framework —"}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Claimant</label>
              <input
                value={form.claimant}
                onChange={e => setForm(p => ({ ...p, claimant: e.target.value }))}
                placeholder="Party name"
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Respondent</label>
              <input
                value={form.respondent}
                onChange={e => setForm(p => ({ ...p, respondent: e.target.value }))}
                placeholder="Party name"
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50"
              />
            </div>
          </div>
          {(claimantConflicts.length > 0 || respondentConflicts.length > 0) && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                {claimantConflicts.map(title => (
                  <p key={`c-${title}`}>"{form.claimant}" appears in an existing matter: <span className="font-medium">{title}</span> — please confirm this isn't a conflict.</p>
                ))}
                {respondentConflicts.map(title => (
                  <p key={`r-${title}`}>"{form.respondent}" appears in an existing matter: <span className="font-medium">{title}</span> — please confirm this isn't a conflict.</p>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Brief description of the dispute..."
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-navy-700 text-slate-300 text-sm hover:bg-navy-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.title || saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gold-500 text-navy-950 font-semibold text-sm hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Matter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
