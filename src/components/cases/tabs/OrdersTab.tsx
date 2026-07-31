import { useEffect, useState } from "react";
import { Plus, Gavel, ChevronDown } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { logCaseEvent } from "../../../lib/caseEvents";

type Order = {
  id: string;
  order_number: number;
  title: string;
  content?: string;
  issued_at?: string;
  status?: string;
};

export default function OrdersTab({ caseId }: { caseId: string }) {
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
    if (data) {
      setOrders(p => [...p, data]);
      logCaseEvent(caseId, user!.id, "order_added", `Procedural Order PO-${data.order_number} added: "${data.title}"`);
    }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
