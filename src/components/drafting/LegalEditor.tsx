import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Loader2,
  Undo2,
  Redo2,
  Link2,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Eraser,
} from "lucide-react";
import "./legalEditor.css";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FONTS = [
  { label: "Default", value: "" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Courier New", value: "Courier New, monospace" },
  { label: "Calibri", value: "Calibri, sans-serif" },
];

const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "36", "48"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface EditorAiAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

interface LegalEditorProps {
  /** Markdown is the canonical format — value in, markdown out. */
  value: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
  /** Receives the live Editor instance so the parent can run AI commands. */
  onReady?: (editor: Editor) => void;
  /** Fires with the currently selected plain text (empty string when collapsed). */
  onSelectionTextChange?: (text: string) => void;
  /** Inline AI actions shown in the selection bubble menu. */
  aiActions?: EditorAiAction[];
  onAiAction?: (actionId: string) => void;
  aiActionLoading?: string | null;
  /** id applied to the content area so the PDF exporter can capture it. */
  contentId?: string;
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------
function TB({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-7 h-7 shrink-0 rounded-md transition-colors ${
        active
          ? "bg-navy-950 text-white"
          : "text-slate-500 hover:text-navy-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LegalEditor({
  value,
  onChange,
  editable = true,
  onReady,
  onSelectionTextChange,
  aiActions = [],
  onAiAction,
  aiActionLoading,
  contentId,
}: LegalEditorProps) {
  const lastEmitted = useRef(value);
  const readyFired = useRef(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const highlightInputRef = useRef<HTMLInputElement>(null);
  const [textColor, setTextColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#ffff00");

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Start drafting your legal document…" }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
        breaks: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "legal-editor prose-doc text-sm leading-relaxed focus:outline-none min-h-[600px]",
      },
    },
    onUpdate: ({ editor }) => {
      const md = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
      lastEmitted.current = md;
      onChange(md);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      onSelectionTextChange?.(empty ? "" : editor.state.doc.textBetween(from, to, " "));
    },
  });

  useEffect(() => {
    if (editor && !readyFired.current) {
      readyFired.current = true;
      onReady?.(editor);
    }
  }, [editor, onReady]);

  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      editor.commands.setContent(value, { emitUpdate: false });
      lastEmitted.current = value;
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  // Computed state for dropdowns
  const currentStyle = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
    ? "h3"
    : "paragraph";

  const currentFontFamily = editor.getAttributes("textStyle").fontFamily || "";
  const currentFontSize = (editor.getAttributes("textStyle").fontSize || "").replace("pt", "");

  const handleLinkToggle = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const url = window.prompt("Enter URL:", "https://");
      if (url !== null && url.trim()) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
      }
    }
  };

  const selectClass =
    "h-7 text-xs bg-transparent border border-slate-200 rounded px-1 text-slate-600 cursor-pointer focus:outline-none hover:border-slate-300 shrink-0";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/60 sticky top-0 z-10 overflow-x-auto">
          {/* Undo / Redo */}
          <TB title="Undo" onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 size={14} />
          </TB>
          <TB title="Redo" onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 size={14} />
          </TB>

          <Sep />

          {/* Style */}
          <select
            value={currentStyle}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "paragraph") {
                editor.chain().focus().setParagraph().run();
              } else {
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: Number(v.replace("h", "")) as 1 | 2 | 3 })
                  .run();
              }
            }}
            className={selectClass}
            style={{ minWidth: 108 }}
          >
            <option value="paragraph">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          <Sep />

          {/* Font family */}
          <select
            value={currentFontFamily}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.value) {
                editor.chain().focus().setFontFamily(e.target.value).run();
              } else {
                editor.chain().focus().unsetFontFamily().run();
              }
            }}
            className={selectClass}
            style={{ minWidth: 136 }}
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <Sep />

          {/* Font size */}
          <select
            value={currentFontSize}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.value) {
                (editor.chain().focus() as any).setFontSize(`${e.target.value}pt`).run();
              } else {
                (editor.chain().focus() as any).unsetFontSize().run();
              }
            }}
            className={selectClass}
            style={{ minWidth: 52 }}
          >
            <option value="">—</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <Sep />

          {/* Text formatting */}
          <TB
            title="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={14} />
          </TB>
          <TB
            title="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={14} />
          </TB>
          <TB
            title="Underline"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon size={14} />
          </TB>
          <TB
            title="Strikethrough"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={14} />
          </TB>

          <Sep />

          {/* Text color */}
          <div className="relative">
            <TB title="Text color" onClick={() => colorInputRef.current?.click()}>
              <span className="flex flex-col items-center justify-center gap-px">
                <span className="text-xs font-bold leading-none" style={{ color: textColor }}>
                  A
                </span>
                <span
                  className="block w-3.5 h-1 rounded-sm"
                  style={{ backgroundColor: textColor }}
                />
              </span>
            </TB>
            <input
              ref={colorInputRef}
              type="color"
              value={textColor}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              onChange={(e) => {
                setTextColor(e.target.value);
                editor.chain().focus().setColor(e.target.value).run();
              }}
            />
          </div>

          {/* Highlight color */}
          <div className="relative">
            <TB
              title="Highlight color"
              active={editor.isActive("highlight")}
              onClick={() => highlightInputRef.current?.click()}
            >
              <span className="flex flex-col items-center justify-center gap-px">
                <span
                  className="text-xs font-bold leading-none px-0.5"
                  style={{ backgroundColor: highlightColor }}
                >
                  H
                </span>
                <span
                  className="block w-3.5 h-1 rounded-sm"
                  style={{ backgroundColor: highlightColor }}
                />
              </span>
            </TB>
            <input
              ref={highlightInputRef}
              type="color"
              value={highlightColor}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              onChange={(e) => {
                setHighlightColor(e.target.value);
                editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
              }}
            />
          </div>

          <Sep />

          {/* Alignment */}
          <TB
            title="Align left"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft size={14} />
          </TB>
          <TB
            title="Align center"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter size={14} />
          </TB>
          <TB
            title="Align right"
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight size={14} />
          </TB>
          <TB
            title="Justify"
            active={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify size={14} />
          </TB>

          <Sep />

          {/* Lists + indent */}
          <TB
            title="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={14} />
          </TB>
          <TB
            title="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={14} />
          </TB>
          <TB
            title="Blockquote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={14} />
          </TB>
          <TB
            title="Decrease indent"
            onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          >
            <span className="text-xs font-mono leading-none select-none">⇤</span>
          </TB>
          <TB
            title="Increase indent"
            onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          >
            <span className="text-xs font-mono leading-none select-none">⇥</span>
          </TB>

          <Sep />

          {/* Insert */}
          <TB
            title={editor.isActive("link") ? "Remove link" : "Insert link"}
            active={editor.isActive("link")}
            onClick={handleLinkToggle}
          >
            <Link2 size={14} />
          </TB>
          <TB
            title="Insert table"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            <TableIcon size={14} />
          </TB>
          <TB
            title="Section divider"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus size={14} />
          </TB>

          <Sep />

          {/* Super / subscript */}
          <TB
            title="Superscript"
            active={editor.isActive("superscript")}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <SuperscriptIcon size={14} />
          </TB>
          <TB
            title="Subscript"
            active={editor.isActive("subscript")}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <SubscriptIcon size={14} />
          </TB>

          <Sep />

          {/* Clear formatting */}
          <TB
            title="Clear formatting"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            <Eraser size={14} />
          </TB>
        </div>
      )}

      {/* Inline AI bubble menu on selection */}
      {aiActions.length > 0 && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor }) => editor.isEditable && !editor.state.selection.empty}
          options={{ placement: "top" }}
        >
          <div className="flex items-center gap-0.5 px-1.5 py-1 bg-navy-950 rounded-lg shadow-xl border border-navy-800">
            {aiActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onAiAction?.(action.id)}
                disabled={!!aiActionLoading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              >
                {aiActionLoading === action.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <action.icon size={11} />
                )}
                {action.label}
              </button>
            ))}
          </div>
        </BubbleMenu>
      )}

      <div id={contentId} className="p-8 bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
