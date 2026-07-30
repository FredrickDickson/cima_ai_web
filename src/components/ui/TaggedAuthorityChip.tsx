import { Gavel, Landmark, FileText, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AuthorityType } from "../../lib/mentions";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TYPE_META: Record<AuthorityType, { Icon: typeof Gavel; sublabel: string }> = {
  case: { Icon: Gavel, sublabel: "Case Law" },
  statute: { Icon: Landmark, sublabel: "Legislation" },
  document: { Icon: FileText, sublabel: "Your Document" },
};

export interface TaggedAuthorityChipProps {
  type: AuthorityType;
  label: string;
  onRemove: () => void;
  /** Match the surrounding page's theme — Research/DraftingStudio are light cards, AI Assistant is a dark chat UI. */
  variant?: "light" | "dark";
  className?: string;
}

/** Visual chip for an @-tagged authority, generalized from the case/document attach pills in AIAssistant.tsx. */
export function TaggedAuthorityChip({ type, label, onRemove, variant = "light", className }: TaggedAuthorityChipProps) {
  const { Icon, sublabel } = TYPE_META[type];
  const dark = variant === "dark";

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 pl-1 pr-2 py-1 min-w-[120px] max-w-[220px] rounded-[6px] border shadow-sm group",
        dark ? "bg-navy-800/80 border-navy-700" : "bg-slate-50 border-slate-200",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 self-stretch shrink-0 rounded-[4px]",
          dark ? "bg-navy-900" : "bg-white border border-slate-200",
        )}
      >
        <Icon className={cn("size-4", dark ? "text-gold-500" : "text-navy-700")} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className={cn("text-xs font-medium truncate", dark ? "text-slate-200" : "text-navy-950")} title={label}>
          {label}
        </span>
        <span className={cn("text-[10px]", dark ? "text-slate-500" : "text-slate-500")}>{sublabel}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "absolute -top-1.5 -right-1.5 size-4 rounded-full border flex items-center justify-center transition-opacity duration-150 ease-out z-10 opacity-0 group-hover:opacity-100",
          dark
            ? "bg-navy-900 border-navy-700 text-slate-400 hover:text-slate-200"
            : "bg-white border-slate-200 text-slate-400 hover:text-slate-700",
        )}
      >
        <X size={12} />
      </button>
    </div>
  );
}
