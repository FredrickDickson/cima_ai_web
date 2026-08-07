import { Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AuthoritySearchResult } from "../../lib/authoritySearch";
import type { AuthorityType } from "../../lib/mentions";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GROUPS: { type: AuthorityType; label: string }[] = [
  { type: "case", label: "Case Law" },
  { type: "statute", label: "Legislation" },
  { type: "document", label: "Your Documents" },
];

export interface MentionPopupProps {
  results: AuthoritySearchResult[];
  loading: boolean;
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (result: AuthoritySearchResult) => void;
  variant?: "light" | "dark";
  /** "up" opens above the textarea instead of below — use for inputs pinned to the bottom of the viewport (e.g. a chat box) so the dropdown isn't clipped by the viewport edge. */
  direction?: "down" | "up";
}

/** Dropdown shown while an "@" mention trigger is active. Positioned by the caller inside a `relative` wrapper. */
export function MentionPopup({ results, loading, activeIndex, onHover, onSelect, variant = "light", direction = "down" }: MentionPopupProps) {
  const dark = variant === "dark";
  const up = direction === "up";

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-50 max-h-64 overflow-y-auto rounded-lg border shadow-lg",
        up ? "bottom-full mb-1" : "top-full mt-1",
        dark ? "bg-navy-900 border-navy-700" : "bg-white border-slate-200",
      )}
    >
      {loading && (
        <div className={cn("flex items-center gap-2 px-3 py-2.5 text-xs", dark ? "text-slate-400" : "text-slate-500")}>
          <Loader2 size={12} className="animate-spin" /> Searching…
        </div>
      )}
      {!loading && results.length === 0 && (
        <div className={cn("px-3 py-2.5 text-xs", dark ? "text-slate-500" : "text-slate-400")}>
          No matching cases, legislation, or documents.
        </div>
      )}
      {!loading &&
        GROUPS.map((group) => {
          const items = results.filter((r) => r.type === group.type);
          if (items.length === 0) return null;
          return (
            <div key={group.type} className="py-1">
              <p
                className={cn(
                  "px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  dark ? "text-slate-500" : "text-slate-400",
                )}
              >
                {group.label}
              </p>
              {items.map((item) => {
                const index = results.indexOf(item);
                const active = index === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => onHover(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(item);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs transition-colors",
                      active
                        ? dark
                          ? "bg-gold-500/10 text-gold-400"
                          : "bg-navy-50 text-navy-900"
                        : dark
                          ? "text-slate-300 hover:bg-navy-800"
                          : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <p className="font-medium truncate">{item.label}</p>
                    {item.citation && (
                      <p className={cn("truncate", dark ? "text-slate-500" : "text-slate-400")}>{item.citation}</p>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
    </div>
  );
}
