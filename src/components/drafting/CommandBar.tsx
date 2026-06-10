import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, CornerDownLeft, X } from "lucide-react";

interface CommandBarProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (instruction: string) => void | Promise<void>;
  loading?: boolean;
  hasSelection?: boolean;
}

const CHIPS = [
  "Draft an arbitration clause",
  "Rewrite professionally",
  "Add supporting authority",
  "Summarize this section",
  "Draft a procedural order",
  "Make this more concise",
];

export default function CommandBar({ open, onClose, onSubmit, loading, hasSelection }: CommandBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  function run(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    void onSubmit(t);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-navy-950/30 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100">
          <Sparkles size={16} className="text-gold-500 shrink-0" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                run(value);
              }
            }}
            placeholder={hasSelection ? "Tell the AI what to do with the selection…" : "Ask the AI to draft or edit the document…"}
            className="flex-1 text-sm text-navy-950 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          {loading ? (
            <Loader2 size={15} className="animate-spin text-navy-500 shrink-0" />
          ) : (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setValue(c);
                  run(c);
                }}
                disabled={loading}
                className="px-2.5 py-1 text-xs text-navy-700 bg-slate-50 hover:bg-navy-50 border border-slate-200 rounded-full transition-colors disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
          <CornerDownLeft size={11} /> to run · Esc to close
          {hasSelection && <span className="text-navy-500">· acting on selected text</span>}
        </div>
      </div>
    </div>
  );
}
