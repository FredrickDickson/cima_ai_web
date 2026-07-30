import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, AlertTriangle } from "lucide-react";

export interface CitedSource {
  marker: string;
  source_name: string;
  citation?: string;
  source_type?: string;
  jurisdiction?: string;
  content: string;
  url?: string;
  doc_id?: string;
}

const CITE_PREFIX = "cima-cite://";
// Matches [1], [L2], [R3] — a letter prefix followed by digits, inside brackets.
const MARKER_PATTERN = /\[([A-Za-z]{0,2}\d+)\]/g;

function preprocess(text: string): string {
  return text.replace(MARKER_PATTERN, (full, marker) => `[[${marker}]](${CITE_PREFIX}${marker})`);
}

function CitationChip({ marker, source }: { marker: string; source?: CitedSource }) {
  const navigate = useNavigate();

  if (!source) {
    return (
      <span
        title="Could not match this citation to a retrieved source."
        className="inline-flex items-center gap-0.5 align-super text-[10px] font-semibold px-1 py-0.5 mx-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
      >
        <AlertTriangle size={9} />
        {marker}
      </span>
    );
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (source!.doc_id) {
      navigate(`/library/${source!.doc_id}`);
    } else if (source!.url) {
      window.open(source!.url, "_blank", "noopener,noreferrer");
    }
  }

  const clickable = Boolean(source.doc_id || source.url);
  const title = `${source.source_name}${source.citation ? ` (${source.citation})` : ""}`;

  return (
    <span
      onClick={clickable ? handleClick : undefined}
      title={title}
      className={`inline-flex items-center gap-0.5 align-super text-[10px] font-semibold px-1 py-0.5 mx-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 ${
        clickable ? "cursor-pointer hover:bg-emerald-100" : "cursor-help"
      }`}
    >
      <Check size={9} />
      {marker}
    </span>
  );
}

export function CitedMarkdown({ text, sources }: { text: string; sources?: CitedSource[] }) {
  if (!sources || sources.length === 0) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
  }

  const byMarker = new Map(sources.map((s) => [s.marker, s]));
  const processed = preprocess(text);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          if (typeof href === "string" && href.startsWith(CITE_PREFIX)) {
            const marker = href.slice(CITE_PREFIX.length);
            return <CitationChip marker={marker} source={byMarker.get(marker)} />;
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}
