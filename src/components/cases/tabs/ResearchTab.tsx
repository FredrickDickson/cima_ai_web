import { useEffect, useState } from "react";
import { BookOpen, Search, ChevronDown, Clock, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import type { CaseContext } from "../caseAI";

type ResearchSession = {
  id: string;
  query: string;
  jurisdiction?: string;
  ai_analysis?: string;
  created_at: string;
};

const FRAMEWORK_TO_JURISDICTION: Record<string, string> = {
  "Ghana ADR Act 2010": "ghana",
  "ICC Rules": "international",
  "UNCITRAL Rules": "international",
  "LCIA Rules": "england_wales",
  "New York Convention": "international",
  "AFSA Rules": "international",
};

export default function ResearchTab({ caseId, caseData }: { caseId: string; caseData: CaseContext }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinked, setUnlinked] = useState<ResearchSession[]>([]);
  const [linking, setLinking] = useState<string | null>(null);

  const jurisdiction = FRAMEWORK_TO_JURISDICTION[caseData.framework ?? ""] ?? "ghana";

  useEffect(() => {
    supabase.from("research_sessions").select("id, query, jurisdiction, ai_analysis, created_at")
      .eq("case_id", caseId).order("created_at", { ascending: false })
      .then(({ data }) => { setSessions(data ?? []); setLoading(false); });
  }, [caseId]);

  async function openLinkModal() {
    const { data } = await supabase.from("research_sessions")
      .select("id, query, jurisdiction, created_at")
      .eq("user_id", user!.id)
      .is("case_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    setUnlinked(data ?? []);
    setShowLinkModal(true);
  }

  async function linkSession(sessionId: string) {
    setLinking(sessionId);
    const { error } = await supabase.from("research_sessions").update({ case_id: caseId } as never).eq("id", sessionId);
    if (error) {
      showToast(`Failed to link session: ${error.message}`, "error");
    } else {
      const session = unlinked.find(s => s.id === sessionId);
      if (session) {
        setSessions(p => [session, ...p]);
        setUnlinked(p => p.filter(s => s.id !== sessionId));
      }
    }
    setLinking(null);
  }

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading research sessions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{sessions.length} session{sessions.length !== 1 ? "s" : ""} linked</p>
        <div className="flex gap-2">
          <button onClick={openLinkModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 border border-navy-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors">
            Link Existing
          </button>
          <button onClick={() => navigate(`/research?case_id=${caseId}&jurisdiction=${jurisdiction}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
            <Search size={13} />Research for this Case
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-navy-700 rounded-xl">
          <BookOpen size={32} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-400 font-medium">No research sessions linked</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Run a research query linked to this case, or attach existing sessions.</p>
          <button onClick={() => navigate(`/research?case_id=${caseId}&jurisdiction=${jurisdiction}`)}
            className="px-4 py-2 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors">
            Start Research
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="border border-navy-700 rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(p => p === s.id ? null : s.id)}
                className="w-full flex items-start gap-3 p-4 hover:bg-navy-800/30 transition-colors text-left">
                <BookOpen size={14} className="text-gold-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white line-clamp-2">{s.query}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={10} />{new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {s.jurisdiction && <span className="text-xs text-slate-500 capitalize">{s.jurisdiction.replace("_", " ")}</span>}
                  </div>
                </div>
                <ChevronDown size={14} className={`text-slate-500 shrink-0 mt-1 transition-transform ${expanded === s.id ? "rotate-180" : ""}`} />
              </button>
              {expanded === s.id && s.ai_analysis && (
                <div className="px-4 pb-4 border-t border-navy-800">
                  <p className="text-xs font-semibold text-gold-400 mt-3 mb-2">AI Analysis</p>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-10">{s.ai_analysis}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
              <h2 className="text-sm font-semibold text-white">Link Existing Research</h2>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-2">
              {unlinked.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No unlinked research sessions found.</p>
              ) : unlinked.map(s => (
                <div key={s.id} className="flex items-start gap-3 p-3 bg-navy-800/50 border border-navy-700 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white line-clamp-2">{s.query}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(s.created_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  <button onClick={() => linkSession(s.id)} disabled={!!linking}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg font-semibold hover:bg-gold-400 disabled:opacity-50 shrink-0 transition-colors">
                    {linking === s.id ? "Linking..." : <><Check size={11} />Link</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
