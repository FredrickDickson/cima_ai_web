import { useState } from "react";
import {
  Briefcase, ChevronRight, BarChart2, ShieldAlert, Calendar,
  Layers, FileText, Gavel, Zap, BookOpen, PenTool, Scale,
} from "lucide-react";
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
  { id: "ai", label: "AI Insights", icon: Zap },
];

export default function CaseWorkspace({ caseData, onBack }: { caseData: Case; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-navy-800 shrink-0">
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
        <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${STATUS_COLORS[caseData.status] ?? STATUS_COLORS.pending}`}>
          {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-6 py-2 border-b border-navy-800 overflow-x-auto shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                : "text-slate-400 hover:text-white hover:bg-navy-800"
            }`}>
            <tab.icon size={13} />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && <OverviewTab caseData={caseData} onTabChange={setActiveTab} />}
        {activeTab === "issues" && <IssuesTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "timeline" && <DeadlinesTab caseId={caseData.id} />}
        {activeTab === "hearings" && <HearingsTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "evidence" && <EvidenceTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "documents" && <DocumentsTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "orders" && <OrdersTab caseId={caseData.id} />}
        {activeTab === "research" && <ResearchTab caseId={caseData.id} caseData={caseData} />}
        {activeTab === "drafts" && <DraftsTab caseId={caseData.id} />}
        {activeTab === "ai" && <AIInsightsTab caseData={caseData} />}
      </div>
    </div>
  );
}
