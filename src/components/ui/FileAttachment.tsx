import { useState } from "react";
import { X, FileText, FileCode, Braces, Image } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type FileAttachmentProps = {
  id?: string;
  filename: string;
  size?: number;
  isImage?: boolean;
  url?: string;
  onRemove?: () => void;
  className?: string;
  display?: "chip" | "image-only";
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileIconName = "image" | "code" | "data" | "text";

function getFileIconName(filename: string, isImage?: boolean): FileIconName {
  if (isImage) return "image";
  const ext = filename.split(".").pop()?.toLowerCase();
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "rb",
      "go",
      "rs",
      "java",
      "kt",
      "swift",
      "c",
      "cpp",
      "h",
      "hpp",
      "cs",
      "php",
    ].includes(ext || "")
  ) {
    return "code";
  }
  if (["json", "yaml", "yml", "xml"].includes(ext || "")) return "data";
  return "text";
}

function renderFileIcon(iconName: FileIconName) {
  const cls = "size-4 text-slate-500";
  switch (iconName) {
    case "image":
      return <Image className={cls} />;
    case "code":
      return <FileCode className={cls} />;
    case "data":
      return <Braces className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

export function FileAttachment({
  filename,
  size,
  isImage,
  url,
  onRemove,
  className,
  display = "chip",
}: FileAttachmentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const iconName = getFileIconName(filename, isImage);
  const isImageOnly = display === "image-only" && isImage && !!url;

  return (
    <div
      className={cn(
        "relative bg-navy-800/80 rounded-[6px] border border-navy-700",
        isImageOnly
          ? "size-10 flex items-center justify-center"
          : "flex items-center gap-2 pl-1 pr-2 py-1 min-w-[120px] max-w-[200px]",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isImageOnly ? (
        <div className="size-8 overflow-hidden shrink-0 rounded-[4px]">
          <img
            src={url}
            alt={filename}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <>
          {isImage && url ? (
            <div className="w-8 self-stretch overflow-hidden shrink-0 rounded-[4px]">
              <img
                src={url}
                alt={filename}
                className="w-full h-full object-cover aspect-square"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 self-stretch bg-navy-900 shrink-0 rounded-[4px] py-1">
              {renderFileIcon(iconName)}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span
              className="text-xs font-medium text-slate-200 truncate"
              title={filename}
            >
              {filename}
            </span>
            {size !== undefined && (
              <span className="text-[10px] text-slate-500">
                {formatFileSize(size)}
              </span>
            )}
          </div>
        </>
      )}

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "absolute -top-1.5 -right-1.5 size-4 rounded-full bg-navy-900 border border-navy-700",
            "flex items-center justify-center transition-[opacity,transform] duration-150 ease-out active:scale-[0.97] z-10",
            "text-slate-400 hover:text-slate-200",
            isHovered ? "opacity-100" : "opacity-0",
          )}
          type="button"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
