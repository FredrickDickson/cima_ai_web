import { useQuery } from "convex/react";
import { Loader2, CheckCircle2, AlertCircle, FileStack } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Live progress card for a document being processed by the Convex
 * large-document pipeline (convex/largeDocumentIngestion.ts). Reactive —
 * useQuery re-renders on every status/progress write server-side, no
 * polling needed, unlike the Supabase-backed small-document status field.
 */
export function LargeDocumentProgress({ docId, onDismiss }: { docId: Id<"largeDocuments">; onDismiss?: () => void }) {
  const doc = useQuery(api.largeDocuments.get, { docId });

  if (doc === undefined) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-navy-50 border border-navy-200 rounded-lg">
        <Loader2 size={16} className="animate-spin text-navy-500" />
        <span className="text-sm text-slate-600">Loading…</span>
      </div>
    );
  }
  if (doc === null) return null;

  const pagesPct = doc.totalPages ? Math.min(100, Math.round((doc.pagesProcessed / doc.totalPages) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="shrink-0">
        {doc.status === "ready" ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : doc.status === "error" ? (
          <AlertCircle size={18} className="text-red-500" />
        ) : (
          <FileStack size={18} className="text-navy-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy-950 truncate" title={doc.name}>
          {doc.name}
        </p>
        {doc.status === "error" ? (
          <p className="text-xs text-red-600 mt-0.5">{doc.errorMessage ?? "Processing failed"}</p>
        ) : doc.status === "ready" ? (
          <p className="text-xs text-emerald-600 mt-0.5">
            Ready — {doc.totalPages?.toLocaleString()} pages, {doc.totalChunks.toLocaleString()} chunks
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500 mt-0.5">
              {doc.status === "queued" && "Queued…"}
              {doc.status === "sharding" && "Analyzing document…"}
              {doc.status === "processing" &&
                `Processing — ${doc.pagesProcessed.toLocaleString()} of ${doc.totalPages?.toLocaleString() ?? "?"} pages (${doc.shardsCompleted}/${doc.totalShards ?? "?"} sections)`}
            </p>
            {doc.status === "processing" && (
              <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-navy-500 rounded-full transition-all"
                  style={{ width: `${pagesPct}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>
      {(doc.status === "ready" || doc.status === "error") && onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
