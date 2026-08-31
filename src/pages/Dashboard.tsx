import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  FileText,
  Search,
  Bot,
  Clock,
  TrendingUp,
  Calendar,
  ChevronRight,
  Gavel,
  Scale,
  Plus,
  Sparkles,
  BookOpen,
  PenTool,
  BarChart3,
  Users,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTour } from "../contexts/TourContext";
import type { Case, DbDocument as Document, Hearing } from "../types/database";

interface Stats {
  activeCases: number;
  totalDocuments: number;
  researchSessions: number;
  upcomingHearings: number;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { start: startTour } = useTour();
  const [stats, setStats] = useState<Stats>({ activeCases: 0, totalDocuments: 0, researchSessions: 0, upcomingHearings: 0 });
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [upcomingHearings, setUpcomingHearings] = useState<Hearing[]>([]);

  const autoStartedTourRef = useRef(false);
  useEffect(() => {
    if (autoStartedTourRef.current) return;
    if (!profile || profile.onboarding_completed_at) return;
    autoStartedTourRef.current = true;
    startTour();
  }, [profile, startTour]);

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
    { 
      label: "Active Cases", 
      value: stats.activeCases, 
      icon: Scale, 
      gradient: "from-[#5A2633] to-[#7a3547]",
      iconBg: "bg-[#5A2633]/10",
      iconColor: "text-[#5A2633]",
      change: "Matters in progress" 
    },
    { 
      label: "Documents", 
      value: stats.totalDocuments, 
      icon: FileText, 
      gradient: "from-[#B49A67] to-[#d4b87f]",
      iconBg: "bg-[#B49A67]/10",
      iconColor: "text-[#B49A67]",
      change: "Total uploads" 
    },
    { 
      label: "Research Sessions", 
      value: stats.researchSessions, 
      icon: Search, 
      gradient: "from-[#5A2633] to-[#B49A67]",
      iconBg: "bg-gradient-to-br from-[#5A2633]/10 to-[#B49A67]/10",
      iconColor: "text-[#5A2633]",
      change: "Legal queries" 
    },
    { 
      label: "Upcoming Hearings", 
      value: stats.upcomingHearings, 
      icon: Calendar, 
      gradient: "from-[#8B7355] to-[#B49A67]",
      iconBg: "bg-[#8B7355]/10",
      iconColor: "text-[#8B7355]",
      change: "Scheduled" 
    },
  ];

  const quickActions = [
    { 
      label: "New Research", 
      icon: Search, 
      to: "/research", 
      desc: "Legal search & analysis",
      color: "bg-gradient-to-br from-[#5A2633] to-[#4a1f2a]",
      hoverColor: "hover:shadow-[#5A2633]/20",
    },
    { 
      label: "New Case", 
      icon: Briefcase, 
      to: "/cases", 
      desc: "Arbitration or litigation",
      color: "bg-gradient-to-br from-[#B49A67] to-[#9a8057]",
      hoverColor: "hover:shadow-[#B49A67]/20",
    },
    { 
      label: "Upload Document", 
      icon: FileText, 
      to: "/documents", 
      desc: "PDF, DOCX analysis",
      color: "bg-gradient-to-br from-[#7a3547] to-[#5A2633]",
      hoverColor: "hover:shadow-[#7a3547]/20",
    },
    { 
      label: "Ask AI", 
      icon: Bot, 
      to: "/assistant", 
      desc: "Legal drafting & queries",
      color: "bg-gradient-to-br from-[#8B7355] to-[#6b5a45]",
      hoverColor: "hover:shadow-[#8B7355]/20",
    },
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
      active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      pending: "bg-amber-50 text-amber-700 border border-amber-200",
      closed: "bg-slate-100 text-slate-600 border border-slate-200",
      settled: "bg-blue-50 text-blue-700 border border-blue-200",
    };
    return map[status] ?? "bg-slate-100 text-slate-600 border border-slate-200";
  }

  function docTypeColor(type: string) {
    const map: Record<string, string> = {
      contract: "bg-[#5A2633]/10 text-[#5A2633] border border-[#5A2633]/20",
      brief: "bg-[#B49A67]/10 text-[#8B7355] border border-[#B49A67]/20",
      award: "bg-[#5A2633]/10 text-[#5A2633] border border-[#5A2633]/20",
      evidence: "bg-[#8B7355]/10 text-[#8B7355] border border-[#8B7355]/20",
      statute: "bg-[#B49A67]/10 text-[#B49A67] border border-[#B49A67]/20",
      document: "bg-slate-100 text-slate-600 border border-slate-200",
    };
    return map[type] ?? "bg-slate-100 text-slate-600 border border-slate-200";
  }

  return (
    <AppLayout>
      <Header
        title={`Good ${getGreeting()}, ${profile?.full_name?.split(" ")[0] || "Counsel"}`}
        subtitle="Your legal intelligence workspace"
      />

      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F5F1E8] via-white to-[#F5F1E8]">
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Welcome Banner with Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5A2633] via-[#6a2f3d] to-[#5A2633] shadow-xl"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <img 
                src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=400&fit=crop&q=90" 
                alt="Legal workspace" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Content */}
            <div className="relative px-6 md:px-8 py-8 md:py-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">AI Powered</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>
                    Welcome to CIMA AI
                  </h1>
                  <p className="text-[#F5F1E8]/80 text-sm md:text-base max-w-2xl">
                    Your intelligent legal workspace for arbitration, research, and document analysis. 
                    Powered by AI trained on international legal frameworks.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link 
                    to="/assistant"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#B49A67] hover:bg-[#c4aa77] text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <Sparkles size={16} />
                    Ask AI Assistant
                  </Link>
                  <Link 
                    to="/research"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5"
                  >
                    <Search size={16} />
                    Start Research
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {statCards.map(({ label, value, icon: Icon, gradient, iconBg, iconColor, change }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Gradient Accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500`} />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={22} className={iconColor} />
                    </div>
                    <TrendingUp size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <p className="text-3xl font-bold text-[#252525] mb-1">{value}</p>
                  <p className="text-sm font-semibold text-[#5A2633] mb-1">{label}</p>
                  <p className="text-xs text-slate-500">{change}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#252525] flex items-center gap-2">
                <Zap size={20} className="text-[#B49A67]" />
                Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map(({ label, icon: Icon, to, desc, color, hoverColor }, index) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link
                    to={to}
                    className={`group flex flex-col items-start gap-3 p-5 ${color} text-white rounded-2xl hover:shadow-2xl ${hoverColor} transition-all duration-300 hover:-translate-y-1`}
                  >
                    <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-1">{label}</p>
                      <p className="text-xs text-white/80">{desc}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Cases */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#F5F1E8] to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#5A2633]/10">
                    <Gavel size={18} className="text-[#5A2633]" />
                  </div>
                  <h3 className="text-base font-bold text-[#252525]">Recent Matters</h3>
                </div>
                <Link to="/cases" className="text-sm text-[#5A2633] hover:text-[#B49A67] font-semibold flex items-center gap-1.5 transition-colors group">
                  View all 
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {recentCases.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#5A2633]/5 flex items-center justify-center mx-auto mb-4">
                      <Briefcase size={32} className="text-[#5A2633]/30" />
                    </div>
                    <p className="text-sm font-semibold text-[#252525] mb-2">No matters yet</p>
                    <p className="text-xs text-slate-500 mb-4">Start by creating your first case</p>
                    <Link 
                      to="/cases" 
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#5A2633] to-[#6a2f3d] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                      <Plus size={16} /> 
                      Create Case
                    </Link>
                  </div>
                ) : (
                  recentCases.map((c, index) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link 
                        to="/cases" 
                        className="flex items-center gap-4 px-6 py-4 hover:bg-[#F5F1E8]/50 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#5A2633]/10 to-[#B49A67]/10 shrink-0 group-hover:scale-110 transition-transform">
                          <Scale size={18} className="text-[#5A2633]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#252525] truncate group-hover:text-[#5A2633] transition-colors">{c.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{c.framework || c.type} · {formatDate(c.created_at)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize whitespace-nowrap ${statusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar widgets */}
            <div className="space-y-6">
              {/* AI Assistant Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative overflow-hidden bg-gradient-to-br from-[#5A2633] to-[#4a1f2a] rounded-2xl p-6 shadow-xl"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#B49A67]/20 rounded-full -translate-y-16 translate-x-16" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Online</span>
                  </div>
                  <Bot size={28} className="text-[#B49A67] mb-3" />
                  <h3 className="text-base font-bold text-white mb-2">AI Assistant Ready</h3>
                  <p className="text-xs text-[#F5F1E8]/70 mb-5 leading-relaxed">
                    Legal domain expertise active. Get instant help with research, drafting, and analysis.
                  </p>
                  <Link 
                    to="/assistant" 
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#B49A67] hover:bg-[#c4aa77] text-white rounded-xl text-sm font-bold transition-all hover:shadow-lg"
                  >
                    <Sparkles size={16} />
                    Ask AI Now
                  </Link>
                </div>
              </motion.div>

              {/* Upcoming hearings */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#F5F1E8] to-white">
                  <div className="p-1.5 rounded-lg bg-[#B49A67]/10">
                    <Calendar size={16} className="text-[#B49A67]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#252525]">Upcoming Hearings</h3>
                </div>
                <div className="p-4 space-y-2.5">
                  {upcomingHearings.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No upcoming hearings</p>
                    </div>
                  ) : (
                    upcomingHearings.map((h, index) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-[#F5F1E8] to-white border border-[#B49A67]/10 hover:border-[#B49A67]/30 transition-all"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#B49A67] mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#252525] mb-1 truncate">{h.title}</p>
                          <p className="text-xs text-slate-500">{formatDate(h.scheduled_at)}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent documents */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#F5F1E8] to-white">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#5A2633]/10">
                      <FileText size={16} className="text-[#5A2633]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#252525]">Recent Documents</h3>
                  </div>
                  <Link to="/documents" className="text-xs text-[#5A2633] hover:text-[#B49A67] font-semibold transition-colors">
                    View all
                  </Link>
                </div>
                <div className="p-3 space-y-1.5">
                  {recentDocs.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No documents uploaded</p>
                    </div>
                  ) : (
                    recentDocs.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F5F1E8]/50 transition-all"
                      >
                        <div className="p-1.5 rounded-lg bg-[#5A2633]/5">
                          <FileText size={14} className="text-[#5A2633]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#252525] truncate">{doc.name}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-md capitalize whitespace-nowrap ${docTypeColor(doc.type)}`}>
                          {doc.type}
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A2633]/10 to-[#B49A67]/10">
                <BookOpen size={20} className="text-[#5A2633]" />
              </div>
              <h3 className="text-lg font-bold text-[#252525]">Getting Started with CIMA AI</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { 
                  step: "01", 
                  title: "Create a Matter", 
                  desc: "Open a new arbitration or litigation case to organize your legal work effectively.", 
                  to: "/cases",
                  icon: Briefcase,
                  color: "from-[#5A2633] to-[#6a2f3d]"
                },
                { 
                  step: "02", 
                  title: "Upload Documents", 
                  desc: "Upload contracts, briefs, and evidence for intelligent AI analysis and review.", 
                  to: "/documents",
                  icon: FileText,
                  color: "from-[#B49A67] to-[#9a8057]"
                },
                { 
                  step: "03", 
                  title: "Research the Law", 
                  desc: "Use semantic legal search to find relevant case law and international authorities.", 
                  to: "/research",
                  icon: Search,
                  color: "from-[#8B7355] to-[#6b5a45]"
                },
              ].map(({ step, title, desc, to, icon: Icon, color }, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                >
                  <Link 
                    to={to} 
                    className="group block p-6 border-2 border-slate-100 rounded-2xl hover:border-[#B49A67]/30 hover:bg-gradient-to-br hover:from-[#F5F1E8]/30 hover:to-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-[#B49A67]/50 font-mono tracking-wider">{step}</span>
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${color} opacity-10 group-hover:opacity-100 transition-opacity`}>
                        <Icon size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-[#252525] mb-2 group-hover:text-[#5A2633] transition-colors">{title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#5A2633] opacity-0 group-hover:opacity-100 transition-all">
                      Get started 
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom Stats Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { icon: Users, label: "Legal Professionals", value: "500+" },
              { icon: BarChart3, label: "Cases Analyzed", value: "10K+" },
              { icon: Sparkles, label: "AI Accuracy", value: "98%" },
              { icon: Zap, label: "Avg Response Time", value: "<2s" },
            ].map(({ icon: Icon, label, value }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                className="bg-gradient-to-br from-white to-[#F5F1E8]/50 rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition-all"
              >
                <Icon size={20} className="text-[#5A2633] mx-auto mb-2" />
                <p className="text-lg font-bold text-[#252525] mb-0.5">{value}</p>
                <p className="text-xs text-slate-600">{label}</p>
              </motion.div>
            ))}
          </motion.div>
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
