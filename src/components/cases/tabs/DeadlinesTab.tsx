import { useEffect, useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";

type Deadline = {
  id: string;
  title: string;
  due_date: string;
  type?: string;
  status?: string;
  notes?: string;
};

export default function DeadlinesTab({ caseId }: { caseId: string }) {
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
    const { data } = await supabase.from("deadlines")
      .insert({ ...form, case_id: caseId, user_id: user!.id, status: "pending" })
      .select().maybeSingle();
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
