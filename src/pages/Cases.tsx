import { useEffect, useState } from "react";
import {
  Briefcase, Plus, Scale, Calendar, Users,
  ChevronRight, Gavel, Search, Menu, AlertCircle,
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

type SortBy = "recent" | "deadline" | "title" | "matter_number";
type Urgency = { nextDate?: string; overdueCount: number };

// Inner component — rendered inside AppLayout's SidebarProvider so useSidebar() works
function CasesContent({
  cases,
  loading,
  filtered,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  urgency,
  selectedCase,
  setSelectedCase,
  showNewCase,
  setShowNewCase,
  setCases,
}: {
  cases: Case[];
  loading: boolean;
  filtered: Case[];
  search: string;
  setSearch: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  urgency: Record<string, Urgency>;
  selectedCase: Case | null;
  setSelectedCase: (c: Case | null) => void;
  showNewCase: boolean;
  setShowNewCase: (v: boolean) => void;
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
}) {
  const { toggle } = useSidebar(); // ✓ inside SidebarProvider

  if (selectedCase) {
    return (
      <div className="flex flex-col h-screen bg-navy-950">
        <CaseWorkspace caseData={selectedCase} onBack={() => setSelectedCase(null)} />
      </div>
    );
  }

  return (
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
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              {cases.length} matter{cases.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewCase(true)}
          className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-colors"
        >
          <Plus size={15} /><span className="hidden sm:inline">New </span>Matter
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 md:px-6 py-3 border-b border-navy-800 shrink-0">
        <div className="relative w-full sm:w-56 md:w-72 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search matters..."
            className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {["all", ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterStatus === s
                  ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                  : "text-slate-400 hover:text-white hover:bg-navy-800"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          className="sm:ml-auto px-2.5 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-gold-500/50 shrink-0"
        >
          <option value="recent">Sort: Recent</option>
          <option value="deadline">Sort: Next Deadline</option>
          <option value="title">Sort: Title</option>
          <option value="matter_number">Sort: Matter No.</option>
        </select>
      </div>

      {/* Case list */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase size={40} className="mx-auto mb-4 text-slate-700" />
            <p className="text-slate-400 font-medium">
              {cases.length === 0 ? "No matters yet" : "No matching matters"}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {cases.length === 0 ? "Create your first matter to get started." : "Try adjusting your search or filter."}
            </p>
            {cases.length === 0 && (
              <button
                onClick={() => setShowNewCase(true)}
                className="mt-4 px-4 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-colors"
              >
                Create Matter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const parties: { name: string; role: string }[] = Array.isArray(c.parties) ? c.parties : [];
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="w-full flex items-start gap-3 md:gap-4 p-3 md:p-5 bg-navy-800/30 border border-navy-700 hover:border-gold-500/30 hover:bg-navy-800/60 rounded-xl text-left transition-all group"
                >
                  {/* Icon */}
                  <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gold-500/10 shrink-0 mt-0.5">
                    {c.type === "arbitration" ? <Gavel size={16} className="text-gold-400" /> :
                     c.type === "litigation" ? <Scale size={16} className="text-gold-400" /> :
                     <Users size={16} className="text-gold-400" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white leading-snug truncate">{c.title}</p>
                        {c.matter_number && (
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{c.matter_number}</p>
                        )}
                      </div>
                      {/* Status badge — top-right on mobile */}
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[c.status] ?? STATUS_COLORS.pending}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 mt-1.5 flex-wrap">
                      {parties.length > 0 && (
                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                          {parties.map(p => p.name).join(" v. ")}
                        </span>
                      )}
                      {c.framework && (
                        <span className="text-xs text-slate-500 hidden sm:inline">{c.framework}</span>
                      )}
                      {(() => {
                        const u = urgency[c.id];
                        if (!u) return null;
                        if (u.overdueCount > 0) {
                          return (
                            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <AlertCircle size={10} />{u.overdueCount} overdue
                            </span>
                          );
                        }
                        if (u.nextDate) {
                          const days = Math.ceil((new Date(u.nextDate).getTime() - Date.now()) / 86400000);
                          const soon = days <= 7;
                          return (
                            <span className={`text-xs flex items-center gap-1 shrink-0 ${soon ? "text-amber-400" : "text-slate-500"}`}>
                              <Calendar size={10} />
                              {days <= 0 ? "Due today" : `Due in ${days}d`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <ChevronRight size={15} className="text-slate-600 group-hover:text-gold-400 transition-colors shrink-0 mt-2" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showNewCase && (
        <NewCaseModal
          onClose={() => setShowNewCase(false)}
          onCreated={c => { setCases(p => [c, ...p]); setShowNewCase(false); setSelectedCase(c); }}
          existingCases={cases}
        />
      )}
    </div>
  );
}

export default function Cases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [urgency, setUrgency] = useState<Record<string, Urgency>>({});
  const [showNewCase, setShowNewCase] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setCases(data ?? []); setLoading(false); });
  }, [user]);

  // Cross-matter urgency: batched hearings/deadlines queries across all of
  // the user's matters, grouped by case_id. Re-fetched whenever the list
  // becomes visible again (selectedCase -> null) so it stays fresh after
  // deadlines/hearings are edited inside a matter.
  useEffect(() => {
    if (!user || cases.length === 0 || selectedCase) return;
    const caseIds = cases.map(c => c.id);
    const nowIso = new Date().toISOString();
    Promise.all([
      supabase.from("hearings").select("case_id, scheduled_at")
        .eq("user_id", user.id).eq("status", "scheduled").gte("scheduled_at", nowIso).in("case_id", caseIds),
      supabase.from("deadlines").select("case_id, due_date")
        .eq("user_id", user.id).neq("status", "completed").in("case_id", caseIds),
    ]).then(([hearingsRes, deadlinesRes]) => {
      const map: Record<string, Urgency> = {};
      const now = new Date();
      for (const h of (hearingsRes.data ?? []) as { case_id: string; scheduled_at: string }[]) {
        const e = (map[h.case_id] ??= { overdueCount: 0 });
        if (!e.nextDate || h.scheduled_at < e.nextDate) e.nextDate = h.scheduled_at;
      }
      for (const d of (deadlinesRes.data ?? []) as { case_id: string; due_date: string }[]) {
        const e = (map[d.case_id] ??= { overdueCount: 0 });
        if (new Date(d.due_date) < now) e.overdueCount++;
        else if (!e.nextDate || d.due_date < e.nextDate) e.nextDate = d.due_date;
      }
      setUrgency(map);
    });
  }, [user, cases, selectedCase]);

  const filtered = cases.filter(c => {
    const q = search.toLowerCase();
    const parties: { name: string; role: string }[] = Array.isArray(c.parties) ? c.parties : [];
    const matchSearch = !search ||
      c.title.toLowerCase().includes(q) ||
      (c.matter_number ?? "").toLowerCase().includes(q) ||
      parties.some(p => p.name.toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "matter_number") return (a.matter_number ?? "").localeCompare(b.matter_number ?? "");
    if (sortBy === "deadline") {
      const da = urgency[a.id]?.nextDate;
      const db = urgency[b.id]?.nextDate;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    }
    return 0; // "recent" — already created_at desc from the fetch
  });

  return (
    <AppLayout>
      <CasesContent
        cases={cases}
        loading={loading}
        filtered={sorted}
        search={search}
        setSearch={setSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
        urgency={urgency}
        selectedCase={selectedCase}
        setSelectedCase={setSelectedCase}
        showNewCase={showNewCase}
        setShowNewCase={setShowNewCase}
        setCases={setCases}
      />
    </AppLayout>
  );
}
