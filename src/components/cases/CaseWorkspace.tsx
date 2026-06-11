import { useState } from "react";
import {
  Briefcase, ChevronRight, BarChart2, ShieldAlert, Calendar,
  Layers, FileText, Gavel, Zap, BookOpen, PenTool, Scale, Handshake, Loader2, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import OverviewTab from "./tabs/OverviewTab";
import IssuesTab from "./tabs/IssuesTab";
import DeadlinesTab from "./tabs/DeadlinesTab";
import HearingsTab from "./tabs/HearingsTab";
import EvidenceTab from "./tabs/EvidenceTab";
import DocumentsTab from "./tabs/DocumentsTab";
import OrdersTab from "./tabs/OrdersTab";
import ResearchTab from "./tabs/ResearchTab";
import DraftsTab from "./tabs/DraftsTab";
import AIInsightsTab from "./tabs/AIInsightsTab";
import SettlementTab from "./tabs/SettlementTab";
import AwardWizard from "./AwardWizard";

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

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "issues", label: "Issues", icon: ShieldAlert },
  { id: "timeline", label: "Deadlines", icon: Calendar },
  { id: "hearings", label: "Hearings", icon: Scale },
  { id: "evidence", label: "Evidence", icon: Layers },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "orders", label: "Orders", icon: Gavel },
  { id: "research", label: "Research", icon: BookOpen },
  { id: "drafts", label: "Drafts", icon: PenTool },
  { id: "settlement", label: "Settlement", icon: Handshake },
  { id: "ai", label: "AI Insights", icon: Zap },
];

export default function CaseWorkspace({ caseData, onBack }: { caseData: Case; onBack: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAwardWizard, setShowAwardWizard] = useState(false);
  const [generatingTOR, setGeneratingTOR] = useState(false);
  const [torError, setTorError] = useState("");

  async function generateTOR() {
    setGeneratingTOR(true);
    setTorError("");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
      const claimant = parties.find(p => /claimant/i.test(p.role));
      const respondent = parties.find(p => /respondent/i.test(p.role));

      // Fetch issues to include in TOR
      const { data: issues } = await supabase.from("issues").select("issue_number, description").eq("case_id", caseData.id).order("issue_number");
      const issuesList = (issues ?? []).map((i: { issue_number: number; description: string }) => `${i.issue_number}. ${i.description}`).join("\n");

      const prompt = `Draft a complete Terms of Reference for the arbitration titled "${caseData.title}".

CASE DETAILS:
- Claimant: ${claimant?.name ?? "[Claimant]"}
- Respondent: ${respondent?.name ?? "[Respondent]"}
- All Parties: ${parties.map(p => `${p.name} (${p.role})`).join(", ")}
- Applicable Rules: ${caseData.framework ?? "Ghana ADR Act 2010 (Act 798)"}
- Matter Reference: ${caseData.matter_number ?? ""}
- Description: ${caseData.description ?? ""}

ISSUES FOR DETERMINATION:
${issuesList || "Issues to be determined by the Tribunal"}

Draft a complete 11-section Terms of Reference document including: parties, tribunal composition (to be inserted), background, issues for determination, applicable rules and law, seat (Accra, Ghana), language (English), procedural timetable, place of hearings, confidentiality, and signature blocks. Use professional arbitral drafting language.`;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ prompt, case_id: caseData.id, user_id: user!.id, jurisdiction: "ghana", template_type: "terms_of_reference" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Generation failed (${res.status})`);
      }
      const data = await res.json() as { draft_id?: string };
      if (data.draft_id) navigate(`/drafting?draft_id=${data.draft_id}&case_id=${caseData.id}`);
    } catch (e) {
      setTorError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGeneratingTOR(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-navy-800 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm shrink-0">
          <ChevronRight size={16} className="rotate-180" />Cases
        </button>
        <span className="text-slate-700 shrink-0">/</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/10 shrink-0">
            <Briefcase size={15} className="text-gold-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{caseData.title}</h1>
            {caseData.matter_number && <p className="text-xs text-slate-500 font-mono">{caseData.matter_number}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {caseData.type === "arbitration" && (
            <>
              <button onClick={generateTOR} disabled={generatingTOR}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-navy-800 border border-navy-700 text-slate-300 hover:text-white hover:border-gold-500/30 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                {generatingTOR ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                <span className="hidden sm:inline">Gen </span>ToR
              </button>
              <button onClick={() => setShowAwardWizard(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 hover:bg-gold-500/20 rounded-xl text-xs font-semibold transition-colors">
                <Gavel size={13} /><span className="hidden sm:inline">Draft </span>Award
              </button>
            </>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[caseData.status] ?? STATUS_COLORS.pending}`}>
            {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 sm:px-6 py-2 border-b border-navy-800 overflow-x-auto shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                : "text-slate-400 hover:text-white hover:bg-navy-800"
            }`}>
            <tab.icon size={13} /><span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ToR error banner */}
      {torError && (
        <div className="flex items-center gap-2 mx-3 sm:mx-6 mt-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          <AlertCircle size={13} className="shrink-0" />{torError}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {activeTab === "overview" && <OverviewTab caseData={caseData} onTabChange={setActiveTab} />}
        {activeTab === "issues" && <IssuesTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "timeline" && <DeadlinesTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "hearings" && <HearingsTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "evidence" && <EvidenceTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "documents" && <DocumentsTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "orders" && <OrdersTab caseId={caseData.id} />}
        {activeTab === "research" && <ResearchTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "drafts" && <DraftsTab caseId={caseData.id} />}
        {activeTab === "settlement" && <SettlementTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "ai" && <AIInsightsTab caseData={caseData} />}
      </div>

      {showAwardWizard && (
        <AwardWizard caseData={caseData} onClose={() => setShowAwardWizard(false)} />
      )}
    </div>
  );
}
