import { useEffect, useRef } from "react";
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
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Loader2,
} from "lucide-react";
import "./legalEditor.css";

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
      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
        active ? "bg-navy-950 text-white" : "text-slate-500 hover:text-navy-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
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
  // Tracks the last markdown we emitted so external value changes (generate /
  // restore) re-sync the editor, while normal typing does not clobber the cursor.
  const lastEmitted = useRef(value);
  const readyFired = useRef(false);

  const editor = useEditor({
    editable,
    extensions: [
      // StarterKit (v3) already bundles bold, italic, underline, headings,
      // lists, blockquote, horizontalRule, link and history.
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
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

  // Hand the editor instance to the parent once.
  useEffect(() => {
    if (editor && !readyFired.current) {
      readyFired.current = true;
      onReady?.(editor);
    }
  }, [editor, onReady]);

  // Re-sync when the markdown changes from outside the editor.
  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      editor.commands.setContent(value, { emitUpdate: false });
      lastEmitted.current = value;
    }
  }, [value, editor]);

  // Reflect editable toggles.
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Formatting toolbar */}
      {editable && (
        <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5 border-b border-slate-100 bg-slate-50/60 sticky top-0 z-10">
          <TB title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={14} />
          </TB>
          <TB title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={14} />
          </TB>
          <TB title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={14} />
          </TB>
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <TB title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 size={14} />
          </TB>
          <TB title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={14} />
          </TB>
          <TB title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 size={14} />
          </TB>
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <TB title="Numbered list (1 / 1.1 / 1.1.1)" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={14} />
          </TB>
          <TB title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={14} />
          </TB>
          <TB title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote size={14} />
          </TB>
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <TB title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft size={14} />
          </TB>
          <TB title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter size={14} />
          </TB>
          <TB title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight size={14} />
          </TB>
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <TB title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon size={14} />
          </TB>
          <TB title="Section divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={14} />
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
