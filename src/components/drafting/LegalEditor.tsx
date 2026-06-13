import { useEffect, useRef, useState, useCallback } from "react";
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
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import LineHeight from "tiptap-extension-line-height";
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
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Palette,
  Highlighter,
  Type,
  Subscript as SubIcon,
  Superscript as SuperIcon,
  ChevronDown,
  Minus as IndentDecrease,
  Plus as IndentIncrease,
  Eraser,
  ZoomIn,
  Search,
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

  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlightColor, setShowHighlightColor] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showLineHeight, setShowLineHeight] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Refs for dropdown containers
  const zoomRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const textColorRef = useRef<HTMLDivElement>(null);
  const highlightColorRef = useRef<HTMLDivElement>(null);
  const lineHeightRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (zoomRef.current && !zoomRef.current.contains(event.target as Node)) {
      setShowZoom(false);
    }
    if (styleRef.current && !styleRef.current.contains(event.target as Node)) {
      setShowStyleDropdown(false);
    }
    if (fontRef.current && !fontRef.current.contains(event.target as Node)) {
      setShowFontDropdown(false);
    }
    if (textColorRef.current && !textColorRef.current.contains(event.target as Node)) {
      setShowTextColor(false);
    }
    if (highlightColorRef.current && !highlightColorRef.current.contains(event.target as Node)) {
      setShowHighlightColor(false);
    }
    if (lineHeightRef.current && !lineHeightRef.current.contains(event.target as Node)) {
      setShowLineHeight(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const editor = useEditor({
    editable,
    extensions: [
      // StarterKit (v3) already bundles bold, italic, underline, headings,
      // lists, blockquote, horizontalRule, link and history.
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily.configure({
        types: ["textStyle"],
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Subscript,
      Superscript,
      LineHeight.configure({
        types: ["heading", "paragraph"],
        defaultLineHeight: "1.5",
      }),
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

  // Helper functions for toolbar actions
  const setLink = () => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkDialog(false);
    }
  };

  const setImage = () => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageDialog(false);
    }
  };

  const clearFormatting = () => {
    editor?.chain().focus().unsetAllMarks().run();
    editor?.chain().focus().setParagraph().run();
  };

  const FONT_FAMILIES = [
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Times New Roman", value: "Times New Roman, serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Courier New", value: "Courier New, monospace" },
    { name: "Comic Sans MS", value: "Comic Sans MS, cursive" },
  ];

  const TEXT_STYLES = [
    { name: "Normal text", action: () => editor?.chain().focus().setParagraph().run() },
    { name: "Heading 1", action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
    { name: "Heading 2", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: "Heading 3", action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { name: "Heading 4", action: () => editor?.chain().focus().toggleHeading({ level: 4 }).run() },
    { name: "Heading 5", action: () => editor?.chain().focus().toggleHeading({ level: 5 }).run() },
    { name: "Heading 6", action: () => editor?.chain().focus().toggleHeading({ level: 6 }).run() },
  ];

  const COLORS = [
    "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#efefef", "#ffffff",
    "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff",
    "#9900ff", "#ff00ff",
  ];

  const LINE_HEIGHTS = ["1", "1.15", "1.5", "2", "2.5", "3"];

  const ZOOM_LEVELS = ["50", "75", "100", "125", "150", "200"];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Google Docs-style toolbar */}
      {editable && (
        <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2">
            <TB title="Undo (Ctrl+Z)" onClick={() => editor?.chain().focus().undo().run()}>
              <Undo size={14} />
            </TB>
            <TB title="Redo (Ctrl+Y)" onClick={() => editor?.chain().focus().redo().run()}>
              <Redo size={14} />
            </TB>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 relative" ref={zoomRef}>
            <button
              onClick={() => setShowZoom(!showZoom)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
              title="Zoom level"
            >
              <ZoomIn size={12} />
              {zoom}%
              <ChevronDown size={10} />
            </button>
            {showZoom && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-20">
                {ZOOM_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => { setZoom(Number(level)); setShowZoom(false); }}
                    className="block w-full px-3 py-1 text-xs text-left hover:bg-slate-100"
                    title={`Zoom to ${level}%`}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Style Dropdown */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 relative" ref={styleRef}>
            <button
              onClick={() => setShowStyleDropdown(!showStyleDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
              title="Text style"
            >
              <Type size={12} />
              Normal text
              <ChevronDown size={10} />
            </button>
            {showStyleDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 w-40">
                {TEXT_STYLES.map((style) => (
                  <button
                    key={style.name}
                    onClick={() => { style.action(); setShowStyleDropdown(false); }}
                    className="block w-full px-3 py-1 text-xs text-left hover:bg-slate-100"
                    title={style.name}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Family Dropdown */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 relative" ref={fontRef}>
            <button
              onClick={() => setShowFontDropdown(!showFontDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
              title="Font family"
            >
              Arial
              <ChevronDown size={10} />
            </button>
            {showFontDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 w-32">
                {FONT_FAMILIES.map((font) => (
                  <button
                    key={font.name}
                    onClick={() => { editor?.chain().focus().setFontFamily(font.value).run(); setShowFontDropdown(false); }}
                    className="block w-full px-3 py-1 text-xs text-left hover:bg-slate-100"
                    style={{ fontFamily: font.value }}
                    title={font.name}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* Text Formatting */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2">
            <TB title="Bold (Ctrl+B)" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
              <Bold size={14} />
            </TB>
            <TB title="Italic (Ctrl+I)" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
              <Italic size={14} />
            </TB>
            <TB title="Underline (Ctrl+U)" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon size={14} />
            </TB>
            <TB title="Strikethrough" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}>
              <Strikethrough size={14} />
            </TB>
          </div>

          {/* Text Color */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 relative" ref={textColorRef}>
            <button
              onClick={() => setShowTextColor(!showTextColor)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Text color"
            >
              <Palette size={14} />
            </button>
            {showTextColor && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 p-2 grid grid-cols-9 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => { editor?.chain().focus().setColor(color).run(); setShowTextColor(false); }}
                    className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight Color */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 relative" ref={highlightColorRef}>
            <button
              onClick={() => setShowHighlightColor(!showHighlightColor)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Highlight color"
            >
              <Highlighter size={14} />
            </button>
            {showHighlightColor && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-20 p-2 grid grid-cols-9 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => { editor?.chain().focus().setHighlight({ color }).run(); setShowHighlightColor(false); }}
                    className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Link and Image */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2">
            <button
              onClick={() => setShowLinkDialog(true)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Insert link"
            >
              <LinkIcon size={14} />
            </button>
            <button
              onClick={() => setShowImageDialog(true)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Insert image"
            >
              <ImageIcon size={14} />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2">
            <TB title="Align left" active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
              <AlignLeft size={14} />
            </TB>
            <TB title="Align center" active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
              <AlignCenter size={14} />
            </TB>
            <TB title="Align right" active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
              <AlignRight size={14} />
            </TB>
            <TB title="Justify" active={editor?.isActive({ textAlign: "justify" })} onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
              <AlignJustify size={14} />
            </TB>
          </div>

          {/* Lists and Indentation */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2">
            <TB title="Bullet list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
              <List size={14} />
            </TB>
            <TB title="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
              <ListOrdered size={14} />
            </TB>
            <TB title="Decrease indent" onClick={() => editor?.chain().focus().sinkListItem("listItem").run()}>
              <IndentDecrease size={14} />
            </TB>
            <TB title="Increase indent" onClick={() => editor?.chain().focus().liftListItem("listItem").run()}>
              <IndentIncrease size={14} />
            </TB>
          </div>

          {/* Advanced Formatting */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2">
            <TB title="Subscript" active={editor?.isActive("subscript")} onClick={() => editor?.chain().focus().toggleSubscript().run()}>
              <SubIcon size={14} />
            </TB>
            <TB title="Superscript" active={editor?.isActive("superscript")} onClick={() => editor?.chain().focus().toggleSuperscript().run()}>
              <SuperIcon size={14} />
            </TB>
            <TB title="Blockquote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
              <Quote size={14} />
            </TB>
          </div>

          {/* Line Height */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 relative" ref={lineHeightRef}>
            <button
              onClick={() => setShowLineHeight(!showLineHeight)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              title="Line spacing"
            >
              <Search size={14} />
            </button>
            {showLineHeight && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-20">
                {LINE_HEIGHTS.map((height) => (
                  <button
                    key={height}
                    onClick={() => { editor?.chain().focus().setLineHeight(height).run(); setShowLineHeight(false); }}
                    className="block w-full px-3 py-1 text-xs text-left hover:bg-slate-100"
                    title={`Line height ${height}`}
                  >
                    {height}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Table and Divider */}
          <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2">
            <TB title="Insert table" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <TableIcon size={14} />
            </TB>
            <TB title="Section divider" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
              <Minus size={14} />
            </TB>
          </div>

          {/* Clear Formatting */}
          <div className="flex items-center gap-0.5">
            <TB title="Clear formatting" onClick={clearFormatting}>
              <Eraser size={14} />
            </TB>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-96 shadow-xl">
            <h3 className="text-sm font-semibold mb-3">Insert Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowLinkDialog(false); setLinkUrl(""); }}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={setLink}
                className="px-3 py-1.5 text-sm bg-navy-950 text-white rounded hover:bg-navy-800"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-96 shadow-xl">
            <h3 className="text-sm font-semibold mb-3">Insert Image</h3>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowImageDialog(false); setImageUrl(""); }}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={setImage}
                className="px-3 py-1.5 text-sm bg-navy-950 text-white rounded hover:bg-navy-800"
              >
                Insert
              </button>
            </div>
          </div>
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

      <div id={contentId} className="p-8 bg-white" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
