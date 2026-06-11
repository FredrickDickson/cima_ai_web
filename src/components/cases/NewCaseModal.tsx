import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

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

export default function NewCaseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Case) => void;
}) {
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
    if (data) onCreated(data);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl my-4 sm:my-0">
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
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              required
              placeholder="e.g. Acme Corp v. Delta Industries"
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
