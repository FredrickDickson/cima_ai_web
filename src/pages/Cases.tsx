import { useEffect, useState } from "react";
import {
  Briefcase, Plus, Scale, Calendar, Users,
  ChevronRight, Gavel, Search, Menu,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import CaseWorkspace from "../components/cases/CaseWorkspace";
import NewCaseModal from "../components/cases/NewCaseModal";

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

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  settled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const STATUSES = ["active", "pending", "closed", "settled"];

export default function Cases() {
  const { user } = useAuth();
  const { toggle } = useSidebar();
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-navy-800 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base md:text-xl font-bold text-white">Cases & Matters</h1>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{cases.length} matter{cases.length !== 1 ? "s" : ""} total</p>
            </div>
          </div>
          <button onClick={() => setShowNewCase(true)} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-colors">
            <Plus size={15} /><span className="hidden sm:inline">New </span>Matter
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-navy-800 shrink-0 overflow-x-auto">
          <div className="relative shrink-0 w-40 sm:w-64 md:max-w-xs md:w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50" />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {["all", ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filterStatus === s ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-slate-400 hover:text-white hover:bg-navy-800"
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Case list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
                      {c.type === "arbitration" ? <Gavel size={18} className="text-gold-400" /> :
                       c.type === "litigation" ? <Scale size={18} className="text-gold-400" /> :
                       <Users size={18} className="text-gold-400" />}
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
                    <div className="flex items-center gap-3 shrink-0">
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
