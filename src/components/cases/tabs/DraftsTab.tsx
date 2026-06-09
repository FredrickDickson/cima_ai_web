import { useEffect, useState } from "react";
import { FileText, PenTool, Plus, Clock, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

type Draft = {
  id: string;
  title: string;
  template_type?: string;
  status: string;
  updated_at: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  finalized: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  natural_language: "AI Drafted",
  custom: "Custom",
};

export default function DraftsTab({ caseId }: { caseId: string }) {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("drafts").select("id, title, template_type, status, updated_at, created_at")
      .eq("case_id", caseId).order("updated_at", { ascending: false })
      .then(({ data }) => { setDrafts(data ?? []); setLoading(false); });
  }, [caseId]);

  if (loading) return <div className="text-slate-500 text-sm py-4">Loading drafts...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => navigate(`/drafting?case_id=${caseId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors"
        >
          <Plus size={13} />Generate Document
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-navy-700 rounded-xl">
          <PenTool size={32} className="mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-400 font-medium">No drafts yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Generate a legal document from the Drafting Studio with this case pre-linked.</p>
          <button
            onClick={() => navigate(`/drafting?case_id=${caseId}`)}
            className="px-4 py-2 bg-gold-500 text-navy-950 rounded-lg text-xs font-semibold hover:bg-gold-400 transition-colors"
          >
            Open Drafting Studio
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map(draft => (
            <button
              key={draft.id}
              onClick={() => navigate(`/drafting?draft_id=${draft.id}&case_id=${caseId}`)}
              className="w-full flex items-center gap-4 p-4 bg-navy-800/30 border border-navy-700 hover:border-gold-500/30 hover:bg-navy-800/60 rounded-xl text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-navy-700 flex items-center justify-center shrink-0">
                <FileText size={15} className="text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{draft.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {draft.template_type && (
                    <span className="text-xs text-slate-500">{TYPE_LABELS[draft.template_type] ?? draft.template_type}</span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock size={10} />
                    {new Date(draft.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[draft.status] ?? STATUS_COLORS.draft}`}>
                  {draft.status}
                </span>
                <ExternalLink size={13} className="text-slate-600 group-hover:text-gold-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
