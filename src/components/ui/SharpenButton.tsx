import { Sparkles, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useSharpenQuery } from "../../hooks/useSharpenQuery";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SharpenButtonProps {
  text: string;
  onSharpened: (text: string) => void;
  kind?: string;
  className?: string;
  title?: string;
}

export function SharpenButton({
  text,
  onSharpened,
  kind,
  className,
  title = "Sharpen",
}: SharpenButtonProps) {
  const { sharpen, loading, error } = useSharpenQuery();
  const disabled = loading || !text.trim();

  return (
    <button
      type="button"
      onClick={async () => {
        const refined = await sharpen(text, kind);
        if (refined) onSharpened(refined);
      }}
      disabled={disabled}
      title={error ? `Sharpen failed: ${error}` : title}
      className={cn(
        "p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed",
        loading ? "text-amber-500" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
        className
      )}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
    </button>
  );
}
