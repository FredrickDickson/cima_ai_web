import { useEffect, useState } from "react";
import {
  Briefcase,
  FileText,
  Search,
  Bot,
  Clock,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Gavel,
  Scale,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Case, DbDocument as Document, Hearing } from "../types/database";

interface Stats {
  activeCases: number;
  totalDocuments: number;
  researchSessions: number;
  upcomingHearings: number;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ activeCases: 0, totalDocuments: 0, researchSessions: 0, upcomingHearings: 0 });
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [upcomingHearings, setUpcomingHearings] = useState<Hearing[]>([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const [casesRes, docsRes, docsCountRes, researchRes, hearingsRes] = await Promise.all([
        supabase.from("cases").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("documents").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("research_sessions").select("id").eq("user_id", user!.id),
        supabase.from("hearings").select("*").eq("user_id", user!.id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(3),
      ]);

      const allCases = casesRes.data ?? [];
      setRecentCases(allCases.slice(0, 4));
      setRecentDocs(docsRes.data ?? []);
      setUpcomingHearings(hearingsRes.data ?? []);
      setStats({
        activeCases: (allCases as any[]).filter((c) => c.status === "active").length,
        totalDocuments: docsCountRes.count ?? 0,
        researchSessions: researchRes.data?.length ?? 0,
        upcomingHearings: hearingsRes.data?.length ?? 0,
      });
    }

    load();
  }, [user]);

  const statCards = [
    { label: "Active Cases", value: stats.activeCases, icon: Briefcase, color: "text-blue-600 bg-blue-50", change: "Matters in progress" },
    { label: "Documents", value: stats.totalDocuments, icon: FileText, color: "text-emerald-600 bg-emerald-50", change: "Total uploads" },
    { label: "Research Sessions", value: stats.researchSessions, icon: Search, color: "text-amber-600 bg-amber-50", change: "Legal queries" },
    { label: "Upcoming Hearings", value: stats.upcomingHearings, icon: Calendar, color: "text-rose-600 bg-rose-50", change: "Scheduled" },
  ];

  const quickActions = [
    { label: "New Research", icon: Search, to: "/research", desc: "Legal search & analysis" },
    { label: "New Case", icon: Briefcase, to: "/cases", desc: "Arbitration or litigation" },
    { label: "Upload Document", icon: FileText, to: "/documents", desc: "PDF, DOCX analysis" },
    { label: "Ask AI", icon: Bot, to: "/assistant", desc: "Legal drafting & queries" },
  ];

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function statusColor(status: string) {
    const map: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      pending: "bg-amber-100 text-amber-700",
      closed: "bg-slate-100 text-slate-600",
      settled: "bg-blue-100 text-blue-700",
    };
    return map[status] ?? "bg-slate-100 text-slate-600";
  }

  function docTypeColor(type: string) {
    const map: Record<string, string> = {
      contract: "bg-blue-100 text-blue-700",
      brief: "bg-violet-100 text-violet-700",
      award: "bg-gold-100 text-gold-700",
      evidence: "bg-orange-100 text-orange-700",
      statute: "bg-teal-100 text-teal-700",
      document: "bg-slate-100 text-slate-600",
    };
    return map[type] ?? "bg-slate-100 text-slate-600";
  }

  return (
    <AppLayout>
      <Header
        title={`Good ${getGreeting()}, ${profile?.full_name?.split(" ")[0] || "Counsel"}`}
        subtitle="Your legal intelligence workspace"
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, change }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${color}`}>
                  <Icon size={18} />
                </div>
                <TrendingUp size={14} className="text-slate-300 mt-1" />
              </div>
              <p className="text-2xl font-bold text-navy-950">{value}</p>
              <p className="text-sm font-medium text-navy-900 mt-0.5">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{change}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-semibold text-navy-950 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, to, desc }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-navy-300 hover:shadow-sm transition-all group"
              >
                <div className="p-2 rounded-lg bg-navy-50 group-hover:bg-navy-100 transition-colors">
                  <Icon size={16} className="text-navy-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-950">{label}</p>
                  <p className="text-xs text-slate-400 truncate">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Recent Cases */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gavel size={16} className="text-navy-600" />
                <h3 className="text-sm font-semibold text-navy-950">Recent Matters</h3>
              </div>
              <Link to="/cases" className="text-xs text-navy-600 hover:text-gold-600 font-medium flex items-center gap-1 transition-colors">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentCases.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Briefcase size={28} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No matters yet</p>
                  <Link to="/cases" className="inline-flex items-center gap-1.5 mt-3 text-xs text-navy-600 hover:text-gold-600 font-medium transition-colors">
                    <Plus size={12} /> Create your first case
                  </Link>
                </div>
              ) : (
                recentCases.map((c) => (
                  <Link key={c.id} to="/cases" className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-50 shrink-0">
                      <Scale size={14} className="text-navy-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-950 truncate">{c.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.framework || c.type} · {formatDate(c.created_at)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-4">
            {/* Upcoming hearings */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <Calendar size={15} className="text-navy-600" />
                <h3 className="text-sm font-semibold text-navy-950">Upcoming Hearings</h3>
              </div>
              <div className="p-4 space-y-2">
                {upcomingHearings.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">No upcoming hearings</p>
                ) : (
                  upcomingHearings.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-navy-900">{h.title}</p>
                        <p className="text-xs text-slate-400">{formatDate(h.scheduled_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent documents */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-navy-600" />
                  <h3 className="text-sm font-semibold text-navy-950">Recent Documents</h3>
                </div>
                <Link to="/documents" className="text-xs text-navy-600 hover:text-gold-600 font-medium transition-colors">
                  View all
                </Link>
              </div>
              <div className="p-3 space-y-1.5">
                {recentDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">No documents uploaded</p>
                ) : (
                  recentDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <FileText size={13} className="text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-navy-900 truncate">{doc.name}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${docTypeColor(doc.type)}`}>
                        {doc.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI status */}
            <div className="bg-navy-950 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">CIMA AI Online</span>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Legal AI Ready</p>
              <p className="text-xs text-slate-400 mb-4">Legal domain expertise active. Ask me anything about your cases, contracts, or legal research.</p>
              <Link to="/assistant" className="flex items-center justify-center gap-2 w-full py-2 bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-semibold rounded-lg transition-colors">
                <Bot size={13} />
                Open AI Assistant
              </Link>
            </div>

            {/* Legal notice */}
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                AI outputs are for legal assistance only. Always verify citations and apply professional judgment.
              </p>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-navy-600" />
            <h3 className="text-sm font-semibold text-navy-950">Getting Started with CIMA AI</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Create a Matter", desc: "Open a new arbitration or litigation case to organize your work.", to: "/cases" },
              { step: "02", title: "Upload Documents", desc: "Upload contracts, briefs, and evidence for AI analysis and review.", to: "/documents" },
              { step: "03", title: "Research the Law", desc: "Use semantic legal search to find relevant authority and case law.", to: "/research" },
            ].map(({ step, title, desc, to }) => (
              <Link key={step} to={to} className="p-4 border border-slate-100 rounded-lg hover:border-navy-200 hover:bg-slate-50 transition-all group">
                <span className="text-xs font-bold text-gold-500 font-mono">{step}</span>
                <h4 className="text-sm font-semibold text-navy-950 mt-1.5 mb-1 group-hover:text-navy-700">{title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
