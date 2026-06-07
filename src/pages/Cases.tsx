import { useEffect, useState } from "react";
import {
  Briefcase, Plus, Scale, Calendar, Users, ChevronRight, X, AlertCircle,
  Gavel, Clock, Search, BarChart2, ShieldAlert, Layers, FileText, Zap,
  CheckCircle2, MapPin, ArrowRight, RefreshCw, ChevronDown, BookOpen,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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

type Issue = {
  id: string;
  issue_number: number;
  description: string;
  claimant_position?: string;
  respondent_position?: string;
  status: string;
  created_at: string;
};

type Evidence = {
  id: string;
  title: string;
  type?: string;
  summary?: string;
  created_at: string;
};

type Order = {
  id: string;
  order_number: number;
  title: string;
  content?: string;
  issued_at?: string;
  status?: string;
};

type Deadline = {
  id: string;
  title: string;
  due_date: string;
  type?: string;
  status?: string;
  notes?: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  settled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-amber-500/10 text-amber-400",
  low: "bg-slate-500/10 text-slate-400",
};

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "issues", label: "Issues", icon: ShieldAlert },
  { id: "timeline", label: "Deadlines", icon: Calendar },
  { id: "evidence", label: "Evidence", icon: Layers },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "orders", label: "Orders", icon: Gavel },
  { id: "ai", label: "AI Intelligence", icon: Zap },
];

const CASE_TYPES = ["arbitration", "litigation", "mediation", "advisory", "transactional"];
const FRAMEWORKS = ["", "Ghana ADR Act 2010", "ICC Rules", "UNCITRAL Rules", "LCIA Rules", "New York Convention", "AFSA Rules", "Ad Hoc"];
const STATUSES = ["active", "pending", "closed", "settled"];

// ─── New Case Modal ───────────────────────────────────────────────────────────
function NewCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Case) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", matter_number: "", type: "arbitration", framework: "",
    description: "", claimant: "", respondent: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const parties = [];
    if (form.claimant) parties.push({ name: form.claimant, role: "Claimant" });
    if (form.respondent) parties.push({ name: form.respondent, role: "Respondent" });
    const { data, error: err } = await supabase.from("cases").insert({
      user_id: user!.id,
      title: form.title,
      matter_number: form.matter_number,
      type: form.type,
      framework: form.framework,
      description: form.description,
      parties,
      status: "active",
    }).select().maybeSingle();
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data) onCreated(data);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
          <h2 className="text-white font-semibold">New Matter</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              <AlertCircle size={13} className="shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Matter Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Acme Corp v. Delta Industries"
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50">
                {CASE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Matter Number</label>
              <input value={form.matter_number} onChange={e => setForm(p => ({ ...p, matter_number: e.target.value }))} placeholder="ARB/2025/001"
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Framework / Rules</label>
            <select value={form.framework} onChange={e => setForm(p => ({ ...p, framework: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50">
              {FRAMEWORKS.map(f => <option key={f} value={f}>{f || "— Select framework —"}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Claimant</label>
              <input value={form.claimant} onChange={e => setForm(p => ({ ...p, claimant: e.target.value }))} placeholder="Party name"
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Respondent</label>
              <input value={form.respondent} onChange={e => setForm(p => ({ ...p, respondent: e.target.value }))} placeholder="Party name"
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Brief description of the dispute..."
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-navy-700 text-slate-300 text-sm hover:bg-navy-800 transition-colors">Cancel</button>
            <button type="submit" disabled={!form.title || saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gold-500 text-navy-950 font-semibold text-sm hover:bg-gold-400 transition-colors disabled:opacity-50">
              {saving ? "Creating..." : "Create Matter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ caseData }: { caseData: Case }) {
  const parties: { name: string; role: string }[] = Array.isArray(caseData.parties) ? caseData.parties : [];
  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Users size={14} className="text-gold-400" />Parties</h3>
          {parties.length === 0 ? (
            <p className="text-xs text-slate-500">No parties recorded.</p>
          ) : (
            <div className="space-y-3">
              {parties.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-gold-500/10" : "bg-red-500/10"}`}>
                    <span className={`text-xs font-semibold ${i === 0 ? "text-gold-400" : "text-red-400"}`}>{p.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{p.role}</p>
                    <p className="text-sm text-white">{p.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><BookOpen size={14} className="text-gold-400" />Details</h3>
          <div className="space-y-2 text-sm">
            {[
              ["Matter No.", caseData.matter_number],
              ["Opened", new Date(caseData.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
              ["Next Hearing", caseData.next_hearing ? new Date(caseData.next_hearing).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null],
            ].map(([k, v]) => v && (
              <div key={String(k)} className="flex justify-between">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-300">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {caseData.description && (
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{caseData.description}</p>
        </div>
      )}
    </div>
  );
}

// ─── Issues Tab ───────────────────────────────────────────────────────────────
function IssuesTab({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", claimant_position: "", respondent_position: "" });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading issues...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{issues.filter(i => i.status === "open").length} open / {issues.length} total</p>
        <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
          <Plus size={13} />Add Issue
        </button>
      </div>

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

// ─── Deadlines Tab ────────────────────────────────────────────────────────────
function DeadlinesTab({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "", type: "filing", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("deadlines").select("*").eq("case_id", caseId).order("due_date", { ascending: true })
      .then(({ data }) => { setDeadlines(data ?? []); setLoading(false); });
  }, [caseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data } = await supabase.from("deadlines").insert({ ...form, case_id: caseId, user_id: user!.id, status: "pending" }).select().maybeSingle();
    if (data) setDeadlines(p => [...p, data].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    setForm({ title: "", due_date: "", type: "filing", notes: "" });
    setShowForm(false);
    setSaving(false);
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading deadlines...</div>;

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{deadlines.filter(d => d.status !== "completed").length} pending</p>
        <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
          <Plus size={13} />Add Deadline
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Deadline title..." required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div key={d.id} className={`flex items-center gap-4 p-4 rounded-xl border ${d.status === "completed" ? "border-navy-800 opacity-60" : overdue ? "border-red-500/30 bg-red-500/5" : "border-navy-700 bg-navy-800/30"}`}>
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
                await supabase.from("deadlines").update({ status: next }).eq("id", d.id);
                setDeadlines(p => p.map(x => x.id === d.id ? { ...x, status: next } : x));
              }} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${d.status === "completed" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-navy-600 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400"}`}>
                {d.status === "completed" ? "Done" : "Mark Done"}
              </button>
            </div>
          );
        })}
        {deadlines.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No deadlines recorded yet.</p>}
      </div>
    </div>
  );
}

// ─── Evidence Tab ─────────────────────────────────────────────────────────────
function EvidenceTab({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "documentary", summary: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("evidence").select("*").eq("case_id", caseId).order("created_at", { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, [caseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data } = await supabase.from("evidence").insert({ ...form, case_id: caseId, user_id: user!.id }).select().maybeSingle();
    if (data) setItems(p => [data, ...p]);
    setForm({ title: "", type: "documentary", summary: "" });
    setShowForm(false);
    setSaving(false);
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading evidence...</div>;

  const typeColors: Record<string, string> = { documentary: "bg-blue-500/10 text-blue-400", testimonial: "bg-purple-500/10 text-purple-400", digital: "bg-cyan-500/10 text-cyan-400", physical: "bg-amber-500/10 text-amber-400" };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{items.length} items</p>
        <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
          <Plus size={13} />Add Evidence
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-navy-800/30 border border-navy-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-white leading-snug">{item.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${typeColors[item.type ?? ""] ?? "bg-slate-500/10 text-slate-400"}`}>{item.type}</span>
            </div>
            {item.summary && <p className="text-xs text-slate-400 line-clamp-3">{item.summary}</p>}
            <p className="text-xs text-slate-600 mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500 col-span-2 text-center py-8">No evidence recorded yet.</p>}
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ caseId }: { caseId: string }) {
  const [docs, setDocs] = useState<{ id: string; name: string; file_type?: string; status?: string; created_at: string; ai_summary?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("documents").select("id, name, file_type, status, created_at, ai_summary").eq("case_id", caseId).order("created_at", { ascending: false })
      .then(({ data }) => { setDocs(data ?? []); setLoading(false); });
  }, [caseId]);

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading documents...</div>;

  const statusBadge: Record<string, string> = { ready: "bg-emerald-500/10 text-emerald-400", processing: "bg-amber-500/10 text-amber-400", error: "bg-red-500/10 text-red-400", pending: "bg-slate-500/10 text-slate-400" };

  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <div key={doc.id} className="flex items-start gap-3 p-4 bg-navy-800/30 border border-navy-700 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-navy-700 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">{doc.name}</span>
              {doc.status && <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[doc.status] ?? ""}`}>{doc.status}</span>}
            </div>
            {doc.ai_summary && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{doc.ai_summary}</p>}
            <p className="text-xs text-slate-600 mt-1">{new Date(doc.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
      {docs.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <FileText size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No documents linked to this case.</p>
          <p className="text-xs mt-1">Upload documents in the Documents section and link them here.</p>
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", issued_at: "" });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("procedural_orders").select("*").eq("case_id", caseId).order("order_number", { ascending: true })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false); });
  }, [caseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data } = await supabase.from("procedural_orders").insert({
      ...form,
      issued_at: form.issued_at || null,
      case_id: caseId,
      user_id: user!.id,
      status: "active",
      order_number: orders.length + 1,
    }).select().maybeSingle();
    if (data) setOrders(p => [...p, data]);
    setForm({ title: "", content: "", issued_at: "" });
    setShowForm(false);
    setSaving(false);
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading orders...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{orders.length} orders</p>
        <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
          <Plus size={13} />Add Order
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Order title..." required
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500/50" />
            <input type="date" value={form.issued_at} onChange={e => setForm(p => ({ ...p, issued_at: e.target.value }))}
              className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Order content / terms..." rows={3}
            className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.title} className="bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold px-4 py-2 hover:bg-gold-400 disabled:opacity-50">{saving ? "..." : "Add"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 border border-navy-600 text-slate-400 rounded-lg text-xs hover:bg-navy-800">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {orders.map(o => (
          <div key={o.id} className="border border-navy-700 rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(p => p === o.id ? null : o.id)} className="w-full flex items-center gap-3 p-4 hover:bg-navy-800/30 transition-colors">
              <Gavel size={14} className="text-gold-400 shrink-0" />
              <span className="text-sm font-medium text-white flex-1 text-left">
                <span className="text-gold-500/70 font-mono text-xs mr-2">PO-{o.order_number}</span>
                {o.title}
              </span>
              <div className="flex items-center gap-2">
                {o.issued_at && <span className="text-xs text-slate-500">{new Date(o.issued_at).toLocaleDateString()}</span>}
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${expanded === o.id ? "rotate-180" : ""}`} />
              </div>
            </button>
            {expanded === o.id && o.content && (
              <div className="px-4 pb-4">
                <div className="bg-navy-900/50 rounded-lg p-3">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{o.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No procedural orders recorded yet.</p>}
      </div>
    </div>
  );
}

// ─── AI Intelligence Tab ──────────────────────────────────────────────────────
function AIIntelligenceTab({ caseData }: { caseData: Case }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const parties: { name: string; role: string }[] = Array.isArray(caseData.parties) ? caseData.parties : [];

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setResponse("");
    const q = question;
    setQuestion("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const systemCtx = `Case: ${caseData.title}. Matter #: ${caseData.matter_number}. Type: ${caseData.type}. Framework: ${caseData.framework}. Parties: ${parties.map(p => `${p.name} (${p.role})`).join(", ")}. Description: ${caseData.description}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemCtx },
            { role: "user", content: q },
          ],
          context: "case_strategy",
        }),
      });
      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content ?? "No response received.";
      setResponse(answer);
      setHistory(p => [{ q, a: answer }, ...p].slice(0, 8));
    } catch {
      setResponse("Failed to get AI response. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const prompts = [
    "What are the strongest legal arguments for this case?",
    "What procedural steps should I take next?",
    "Identify potential weaknesses in our position",
    "Suggest a negotiation / settlement strategy",
    "What precedents are relevant to this dispute?",
    "Draft talking points for the next hearing",
  ];

  return (
    <div className="space-y-4">
      <div className="bg-navy-800/30 border border-gold-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-gold-400" />
          <span className="text-sm font-semibold text-gold-400">AI Case Intelligence</span>
        </div>
        <p className="text-xs text-slate-400">CIMA AI has full context of this matter — parties, type, framework, and description.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map(p => (
          <button key={p} onClick={() => setQuestion(p)}
            className="text-xs px-3 py-1.5 bg-navy-800/50 border border-navy-700 text-slate-400 hover:text-white hover:border-gold-500/30 rounded-lg transition-colors">
            {p}
          </button>
        ))}
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about this case..."
          className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
        <button type="submit" disabled={!question.trim() || loading}
          className="px-4 py-3 bg-gold-500 text-navy-950 rounded-xl hover:bg-gold-400 transition-colors disabled:opacity-50">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </form>

      {loading && (
        <div className="bg-navy-800/30 border border-navy-700 rounded-xl p-4 flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
          <span className="text-sm">Analyzing case...</span>
        </div>
      )}

      {response && (
        <div className="bg-navy-800/30 border border-gold-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={14} className="text-gold-400" />
            <span className="text-xs font-semibold text-gold-400">CIMA AI Analysis</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}

      {history.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Previous Questions</p>
          {history.slice(1).map((h, i) => (
            <div key={i} className="border border-navy-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-navy-800/50 text-xs text-slate-400 border-b border-navy-700">{h.q}</div>
              <div className="px-4 py-3">
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{h.a}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Case Workspace ───────────────────────────────────────────────────────────
function CaseWorkspace({ caseData, onBack }: { caseData: Case; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-navy-800">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
          <ChevronRight size={16} className="rotate-180" />Cases
        </button>
        <span className="text-slate-700">/</span>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/10 shrink-0">
            <Briefcase size={15} className="text-gold-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{caseData.title}</h1>
            {caseData.matter_number && <p className="text-xs text-slate-500 font-mono">{caseData.matter_number}</p>}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[caseData.status] ?? STATUS_COLORS.pending}`}>
          {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
        </span>
      </div>

      <div className="flex items-center gap-1 px-6 py-2 border-b border-navy-800 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-slate-400 hover:text-white hover:bg-navy-800"
            }`}>
            <tab.icon size={13} />{tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && <OverviewTab caseData={caseData} />}
        {activeTab === "issues" && <IssuesTab caseId={caseData.id} />}
        {activeTab === "timeline" && <DeadlinesTab caseId={caseData.id} />}
        {activeTab === "evidence" && <EvidenceTab caseId={caseData.id} />}
        {activeTab === "documents" && <DocumentsTab caseId={caseData.id} />}
        {activeTab === "orders" && <OrdersTab caseId={caseData.id} />}
        {activeTab === "ai" && <AIIntelligenceTab caseData={caseData} />}
      </div>
    </div>
  );
}

// ─── Main Cases Page ──────────────────────────────────────────────────────────
export default function Cases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNewCase, setShowNewCase] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("cases").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setCases(data ?? []); setLoading(false); });
  }, [user]);

  const filtered = cases.filter(c => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.matter_number ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (selectedCase) {
    return (
      <AppLayout>
        <div className="flex flex-col h-screen bg-navy-950">
          <CaseWorkspace caseData={selectedCase} onBack={() => setSelectedCase(null)} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-screen bg-navy-950">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
          <div>
            <h1 className="text-xl font-bold text-white">Cases & Matters</h1>
            <p className="text-xs text-slate-500 mt-0.5">{cases.length} matter{cases.length !== 1 ? "s" : ""} total</p>
          </div>
          <button onClick={() => setShowNewCase(true)} className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-colors">
            <Plus size={15} />New Matter
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b border-navy-800">
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search matters..."
              className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
          </div>
          <div className="flex items-center gap-1.5">
            {["all", ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-slate-400 hover:text-white hover:bg-navy-800"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase size={40} className="mx-auto mb-4 text-slate-700" />
              <p className="text-slate-400 font-medium">{cases.length === 0 ? "No matters yet" : "No matching matters"}</p>
              <p className="text-slate-600 text-sm mt-1">{cases.length === 0 ? "Create your first matter to get started." : "Try adjusting your search or filter."}</p>
              {cases.length === 0 && (
                <button onClick={() => setShowNewCase(true)} className="mt-4 px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-colors">
                  Create Matter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const parties: { name: string; role: string }[] = Array.isArray(c.parties) ? c.parties : [];
                return (
                  <button key={c.id} onClick={() => setSelectedCase(c)}
                    className="w-full flex items-center gap-4 p-5 bg-navy-800/30 border border-navy-700 hover:border-gold-500/30 hover:bg-navy-800/60 rounded-xl text-left transition-all group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500/10 shrink-0">
                      {c.type === "arbitration" ? <Gavel size={18} className="text-gold-400" /> : c.type === "litigation" ? <Scale size={18} className="text-gold-400" /> : <Users size={18} className="text-gold-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{c.title}</span>
                        {c.matter_number && <span className="text-xs text-slate-500 font-mono">{c.matter_number}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {parties.length > 0 && <span className="text-xs text-slate-400">{parties.map(p => p.name).join(" v. ")}</span>}
                        {c.framework && <span className="text-xs text-slate-500">{c.framework}</span>}
                        {c.next_hearing && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <Calendar size={10} />Next: {new Date(c.next_hearing).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.pending}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-gold-400 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showNewCase && (
        <NewCaseModal
          onClose={() => setShowNewCase(false)}
          onCreated={c => { setCases(p => [c, ...p]); setShowNewCase(false); setSelectedCase(c); }}
        />
      )}
    </AppLayout>
  );
}
