import { useEffect, useState, useCallback, useRef } from "react";
import {
  PenTool,
  Search,
  Loader2,
  AlertCircle,
  Download,
  Copy,
  RefreshCw,
  Save,
  Sparkles,
  Bot,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Briefcase,
  FileText,
  Undo2,
  Redo2,
  FileDown,
  History,
  X,
  Plus,
  Globe,
  ArrowRight,
  Scale,
  Edit3,
  Wand2,
  ShieldCheck,
  BookMarked,
  Zap,
  Type,
  Quote,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink,
  Database,
  ArrowDown,
  Menu,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Header from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { exportToWord, exportToPdf } from "../lib/exportDraft";
import type { Template, Case, Draft } from "../types/database";
import LegalEditor from "../components/drafting/LegalEditor";
import CommandBar from "../components/drafting/CommandBar";
import type { Editor } from "@tiptap/react";

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------
interface DraftVersion {
  content: string;
  timestamp: Date;
  action: string;
}

function useVersionHistory() {
  const [past, setPast] = useState<DraftVersion[]>([]);
  const [future, setFuture] = useState<DraftVersion[]>([]);

  const push = useCallback((content: string, action: string) => {
    setPast((prev) => [...prev, { content, timestamp: new Date(), action }]);
    setFuture([]);
  }, []);

  const undo = useCallback(
    (currentContent: string): DraftVersion | null => {
      if (past.length === 0) return null;
      const prev = past[past.length - 1];
      setPast((p) => p.slice(0, -1));
      setFuture((f) => [...f, { content: currentContent, timestamp: new Date(), action: "Undo" }]);
      return prev;
    },
    [past]
  );

  const redo = useCallback(
    (currentContent: string): DraftVersion | null => {
      if (future.length === 0) return null;
      const next = future[future.length - 1];
      setFuture((f) => f.slice(0, -1));
      setPast((p) => [...p, { content: currentContent, timestamp: new Date(), action: "Redo" }]);
      return next;
    },
    [future]
  );

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return { past, future, push, undo, redo, clear, canUndo: past.length > 0, canRedo: future.length > 0 };
}

// ---------------------------------------------------------------------------
// Review types
// ---------------------------------------------------------------------------
interface ReviewItem {
  type: "risk" | "ambiguity" | "missing" | "citation" | "strength";
  severity: "critical" | "high" | "medium" | "low" | "positive";
  title: string;
  detail: string;
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Research result types
// ---------------------------------------------------------------------------
interface ResearchSource {
  id: string;
  source_name: string;
  citation?: string;
  source_type: string;
  jurisdiction?: string;
  content: string;
  similarity?: number;
  url?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORY_ORDER = [
  "Arbitration — Initiation",
  "Arbitration — Pleadings",
  "Arbitration — Procedure",
  "Arbitration — Awards",
  "Contracts — Commercial",
  "Contracts — Employment",
  "Contracts — Property",
  "Dispute Resolution",
  "Corporate",
  "Litigation",
];

const JURISDICTIONS = [
  { value: "ghana", label: "Ghana" },
  { value: "kenya", label: "Kenya" },
  { value: "nigeria", label: "Nigeria" },
  { value: "south africa", label: "South Africa" },
  { value: "international", label: "International" },
  { value: "england_wales", label: "England & Wales" },
  { value: "uncitral", label: "UNCITRAL" },
];

const SUGGESTION_CHIPS = [
  "Notice of Arbitration",
  "Statement of Claim",
  "Non-Disclosure Agreement",
  "Employment Contract",
  "Procedural Order",
  "Legal Opinion",
  "Settlement Agreement",
  "Demand Letter",
  "Shareholder Agreement",
  "Service Agreement",
];

const AI_ACTIONS = [
  { id: "rewrite", label: "Rewrite", icon: Edit3, color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100", prompt: "Rewrite the following text to be clearer, more precise, and more professionally drafted while preserving the legal meaning:" },
  { id: "strengthen", label: "Strengthen Argument", icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100", prompt: "Strengthen the legal arguments in the following text. Make them more persuasive, add supporting reasoning, and use more authoritative language:" },
  { id: "citation", label: "Add Citations", icon: BookMarked, color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100", prompt: "Add appropriate legal citations, case law references, and statutory references to support the arguments in the following text. Use proper legal citation format:" },
  { id: "simplify", label: "Simplify", icon: Type, color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100", prompt: "Simplify the following legal text to be more accessible and easier to understand while maintaining legal accuracy:" },
  { id: "neutral", label: "Make Neutral", icon: Scale, color: "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100", prompt: "Rewrite the following text in a neutral, balanced tone suitable for an arbitrator or mediator, removing any advocacy bias:" },
  { id: "formal", label: "Formalize", icon: Quote, color: "text-navy-600 bg-navy-50 border-navy-200 hover:bg-navy-100", prompt: "Formalize the following text into proper legal language suitable for court or tribunal submissions, ensuring proper legal terminology and structure:" },
];

function groupByCategory(templates: Template[]): Record<string, Template[]> {
  const groups: Record<string, Template[]> = {};
  for (const t of templates) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical": return <XCircle size={14} className="text-red-500 shrink-0" />;
    case "high": return <AlertTriangle size={14} className="text-orange-500 shrink-0" />;
    case "medium": return <AlertCircle size={14} className="text-amber-500 shrink-0" />;
    case "low": return <Info size={14} className="text-blue-500 shrink-0" />;
    case "positive": return <CheckCircle size={14} className="text-emerald-500 shrink-0" />;
    default: return <Info size={14} className="text-slate-400 shrink-0" />;
  }
}

function severityBorder(severity: string) {
  switch (severity) {
    case "critical": return "border-l-red-500";
    case "high": return "border-l-orange-500";
    case "medium": return "border-l-amber-400";
    case "low": return "border-l-blue-400";
    case "positive": return "border-l-emerald-400";
    default: return "border-l-slate-300";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DraftingStudio() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [myDrafts, setMyDrafts] = useState<Draft[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  // Mode: "prompt" (hero), "template" (variable form), "output" (draft view)
  const [mode, setMode] = useState<"prompt" | "template" | "output">("prompt");

  // Natural language prompt state
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlJurisdiction, setNlJurisdiction] = useState("ghana");
  const [nlLinkedCaseId, setNlLinkedCaseId] = useState(searchParams.get("case_id") ?? "");

  // Template-based state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  // Draft output state
  const [draftContent, setDraftContent] = useState("");
  const [legalNotes, setLegalNotes] = useState("");
  const [shortForm, setShortForm] = useState("");
  const [plainEnglish, setPlainEnglish] = useState("");
  const [outputTab, setOutputTab] = useState<"full" | "short" | "plain">("full");
  const [wordCount, setWordCount] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Editor state (Feature 1) — Tiptap rich-text legal editor
  const [selectedText, setSelectedText] = useState("");
  const editorInstanceRef = useRef<Editor | null>(null);

  // AI command bar (Ctrl/Cmd+K)
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);

  // Right panel state (Features 2-5)
  const [rightTab, setRightTab] = useState<"assistant" | "review" | "research" | "clauses">("assistant");
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [researchQuery, setResearchQuery] = useState("");
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [researchAnalysis, setResearchAnalysis] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [validityLoading, setValidityLoading] = useState(false);
  const [validityResult, setValidityResult] = useState("");
  const [showValidity, setShowValidity] = useState(false);

  // Clause library state (C7)
  const [clauseQuery, setClauseQuery] = useState("");
  const [clauseResult, setClauseResult] = useState("");
  const [clauseLoading, setClauseLoading] = useState(false);
  const [clauseMode, setClauseMode] = useState<"library" | "suggest">("library");
  const [clauseSuggestions, setClauseSuggestions] = useState("");

  // UI state
  const [draftLoading, setDraftLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [leftTab, setLeftTab] = useState<"templates" | "drafts">("templates");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([CATEGORY_ORDER[0]]));
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const nlInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Mobile UI state
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const versions = useVersionHistory();

  // Close export menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showExportMenu]);

  // Open the AI command bar with Ctrl/Cmd+K while editing a draft
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (mode === "output" && outputTab === "full") setShowCommandBar((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, outputTab]);

  useEffect(() => {
    loadTemplates();
    loadCases();
    loadDrafts();
    // If navigated from Cases with a draft_id, load it immediately
    const draftIdParam = searchParams.get("draft_id");
    if (draftIdParam && user) {
      setDraftLoading(true);
      supabase.from("drafts").select("*").eq("id", draftIdParam).maybeSingle().then(({ data }) => {
        if (data) loadDraft(data as Draft);
      }).finally(() => setDraftLoading(false));
    }
  }, [user]);

  async function loadTemplates() {
    const { data } = await supabase.from("templates").select("*").order("category").order("title");
    setTemplates(data ?? []);
  }

  async function loadCases() {
    if (!user) return;
    const { data } = await supabase.from("cases").select("id, title, matter_number").eq("user_id", user.id).order("created_at", { ascending: false });
    setCases(data ?? []);
  }

  async function loadDrafts() {
    if (!user) return;
    const { data } = await supabase.from("drafts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setMyDrafts(data ?? []);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function updateWordCount(text: string) {
    setWordCount(text.split(/\s+/).filter(Boolean).length);
  }

  async function callAiChat(messages: { role: string; content: string }[], context = "drafting") {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ messages, context }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || "AI request failed");
    }
    const data = await res.json();
    return data.content ?? "";
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  function handleNewDraft() {
    setDraftContent("");
    setLegalNotes("");
    setShortForm("");
    setPlainEnglish("");
    setOutputTab("full");
    setSelectedTemplate(null);
    setNlPrompt("");
    setDraftId(null);
    setSaved(false);
    setError("");
    setShowVersionHistory(false);
    setAiResult("");
    setReviewItems([]);
    setResearchSources([]);
    setResearchAnalysis("");
    setRightTab("assistant");
    versions.clear();
    setMode("prompt");
  }

  // ---------------------------------------------------------------------------
  // Template selection
  // ---------------------------------------------------------------------------
  function selectTemplate(template: Template) {
    setSelectedTemplate(template);
    const defaults: Record<string, string> = {};
    for (const v of template.variables ?? []) {
      defaults[v.name] = v.default ?? "";
    }
    setVariables(defaults);
    setDraftContent("");
    setLegalNotes("");
    setDraftId(null);
    setSaved(false);
    setError("");
    versions.clear();
    setMode("template");
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Natural language generate
  // ---------------------------------------------------------------------------
  async function handleNlGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!user || !nlPrompt.trim()) return;
    setGenerating(true);
    setError("");
    setDraftContent("");
    setLegalNotes("");
    setShortForm("");
    setPlainEnglish("");
    setOutputTab("full");
    setSaved(false);
    setSelectedTemplate(null);
    setMode("output");

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ prompt: nlPrompt, jurisdiction: nlJurisdiction, case_id: nlLinkedCaseId || undefined, user_id: user.id }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Generation failed"); }
      const data = await res.json();
      setDraftContent(data.content ?? "");
      setLegalNotes(data.legal_notes ?? "");
      setShortForm(data.short_form ?? "");
      setPlainEnglish(data.plain_english ?? "");
      updateWordCount(data.content ?? "");
      setDraftId(data.draft_id ?? null);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft generation failed");
      setMode("prompt");
    } finally {
      setGenerating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Template-based generate
  // ---------------------------------------------------------------------------
  async function handleGenerate() {
    if (!user || !selectedTemplate) return;
    setGenerating(true);
    setError("");
    if (draftContent) versions.push(draftContent, "Before regeneration");
    setDraftContent("");
    setLegalNotes("");
    setShortForm("");
    setPlainEnglish("");
    setOutputTab("full");
    setSaved(false);
    setMode("output");

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          template_id: selectedTemplate.id, template_type: selectedTemplate.template_type,
          jurisdiction: selectedTemplate.jurisdiction, variables,
          custom_instructions: customInstructions || undefined, case_id: linkedCaseId || undefined, user_id: user.id,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Generation failed"); }
      const data = await res.json();
      setDraftContent(data.content ?? "");
      setLegalNotes(data.legal_notes ?? "");
      setShortForm(data.short_form ?? "");
      setPlainEnglish(data.plain_english ?? "");
      updateWordCount(data.content ?? "");
      setDraftId(data.draft_id ?? null);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft generation failed");
      setMode("template");
    } finally {
      setGenerating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Feature 2: AI Panel Actions (apply to full doc or selection)
  // ---------------------------------------------------------------------------
  async function handleAiAction(actionId: string, actionPrompt: string) {
    const editor = editorInstanceRef.current;
    const sel = editor?.state.selection;
    const selText = editor && sel && !sel.empty ? editor.state.doc.textBetween(sel.from, sel.to, " ") : "";
    const textToProcess = selText || draftContent;
    if (!textToProcess) return;
    setAiActionLoading(actionId);
    setAiResult("");
    setError("");

    try {
      const isSelection = !!selText;
      const result = await callAiChat([{
        role: "user",
        content: `${actionPrompt}\n\n${isSelection ? "Selected text" : "Full document"}:\n\n${textToProcess}\n\nReturn ONLY the modified text, no preamble or explanation.`,
      }]);

      if (isSelection && editor && sel) {
        // Replace the selected range in the editor; onChange re-syncs draftContent.
        versions.push(draftContent, `Before: ${actionId}`);
        editor.chain().focus().insertContentAt({ from: sel.from, to: sel.to }, result).run();
        setSaved(false);
        setSelectedText("");
        setAiResult(`Applied "${actionId}" to selected text.`);
      } else {
        // Show result in panel — user decides whether to apply
        setAiResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI action failed");
    } finally {
      setAiActionLoading(null);
    }
  }

  function applyAiResult() {
    if (!aiResult) return;
    versions.push(draftContent, "Before applying AI result");
    setDraftContent(aiResult);
    updateWordCount(aiResult);
    setSaved(false);
    setAiResult("");
  }

  // ---------------------------------------------------------------------------
  // Feature 4: Document Review
  // ---------------------------------------------------------------------------
  async function handleReview() {
    if (!draftContent) return;
    setReviewLoading(true);
    setReviewItems([]);
    setRightTab("review");
    setError("");

    try {
      const result = await callAiChat([{
        role: "user",
        content: `You are an expert legal reviewer. Analyze the following legal document and return a JSON array of findings.

Each finding must be an object with these fields:
- "type": one of "risk", "ambiguity", "missing", "citation", "strength"
- "severity": one of "critical", "high", "medium", "low", "positive"
- "title": short title (under 10 words)
- "detail": 1-2 sentence explanation
- "suggestion": optional suggested fix or improvement

Check for:
1. Legal risks and problematic provisions
2. Ambiguous or vague language
3. Missing standard clauses for this document type
4. Weak or missing citations/legal authorities
5. Strengths worth noting (use "positive" severity)

Document:

${draftContent.slice(0, 10000)}

Return ONLY a valid JSON array. No markdown, no code fences, no explanation.`,
      }], "review");

      const cleaned = result.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
      const parsed: ReviewItem[] = JSON.parse(cleaned);
      setReviewItems(parsed);
    } catch {
      setReviewItems([{
        type: "risk",
        severity: "medium",
        title: "Review could not complete",
        detail: "The AI review encountered an error. Try again or review the document manually.",
      }]);
    } finally {
      setReviewLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Feature 5: Research in editor
  // ---------------------------------------------------------------------------
  async function handleResearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!researchQuery.trim()) return;
    setResearchLoading(true);
    setResearchSources([]);
    setResearchAnalysis("");
    setRightTab("research");
    setError("");

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/legal-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ query: researchQuery, user_id: user?.id }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResearchSources(data.sources ?? []);
      setResearchAnalysis(data.ai_analysis ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearchLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // C7: Clause Recommendation Engine
  // ---------------------------------------------------------------------------
  async function handleClauseSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!clauseQuery.trim()) return;
    setClauseLoading(true);
    setClauseResult("");

    const docContext = draftContent
      ? `\n\nCurrent document context (first 800 chars):\n${draftContent.slice(0, 800)}`
      : "";

    const prompt = `You are a clause library assistant for Ghanaian commercial law and international arbitration.

The user is searching for the clause: "${clauseQuery}"${docContext}

Provide a complete clause reference in exactly this structure:

**CLAUSE NAME:** [Full formal name of the clause]

**DEFINITION:** [1-2 sentence definition of what this clause is]

**PURPOSE:** [Why this clause is included — what risk or obligation it addresses]

**RISKS IF OMITTED:** [What happens if this clause is missing from the agreement — specific legal/commercial consequences]

**WORDING VARIANT 1 — Simple:**
[Complete clause text, simple and concise]

**WORDING VARIANT 2 — Standard:**
[Complete clause text, standard commercial drafting]

**WORDING VARIANT 3 — Comprehensive:**
[Complete clause text, comprehensive with sub-clauses]

**APPLICABLE LAW:** [Any specific Ghanaian statute, common law principle, or international standard relevant to this clause]`;

    try {
      const result = await callAiChat([{ role: "user", content: prompt }], "drafting");
      setClauseResult(result);
    } catch {
      setClauseResult("Failed to retrieve clause. Please try again.");
    } finally {
      setClauseLoading(false);
    }
  }

  async function handleClauseSuggest() {
    setClauseLoading(true);
    setClauseSuggestions("");

    const docTitle = draftContent
      ? draftContent.split("\n").find(l => l.trim())?.replace(/^#+\s*/, "").slice(0, 120) ?? "this document"
      : selectedTemplate?.title ?? "this document";
    const docSnippet = draftContent.slice(0, 1000);

    const prompt = `You are a clause recommendation engine for Ghanaian law and international arbitration.

Document being drafted: "${docTitle}"
${docSnippet ? `Opening content:\n${docSnippet}` : ""}

Analyse the document type and recommend exactly 7 clauses that should be included. For each clause output:
**[NUMBER]. [CLAUSE NAME]** — [One sentence: why it is essential for this document type] | Risk if omitted: [one sentence]

Cover a mix of: commercial protections, dispute resolution, confidentiality, governing law, liability, boilerplate essentials. Tailor specifically to the document type.`;

    try {
      const result = await callAiChat([{ role: "user", content: prompt }], "drafting");
      setClauseSuggestions(result);
    } catch {
      setClauseSuggestions("Failed to generate suggestions. Please try again.");
    } finally {
      setClauseLoading(false);
    }
  }

  function insertClauseVariant(variantText: string) {
    if (!variantText.trim()) return;
    versions.push(draftContent, "Before inserting clause");
    setDraftContent(draftContent + "\n\n" + variantText);
    updateWordCount(draftContent + variantText);
    setSaved(false);
  }

  function insertCitation(source: ResearchSource) {
    const label = source.citation ? `${source.source_name} (${source.citation})` : source.source_name;
    const quote = `${label}: "${source.content.slice(0, 200)}..."`;

    versions.push(draftContent, "Before inserting citation");
    const editor = editorInstanceRef.current;
    if (editor) {
      const pos = editor.state.selection.to;
      editor
        .chain()
        .focus()
        .insertContentAt(pos, {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: quote }] }],
        })
        .run();
    } else {
      const md = `\n\n> **${label}**: "${source.content.slice(0, 200)}..."\n`;
      setDraftContent(draftContent + md);
      updateWordCount(draftContent + md);
    }
    setSaved(false);
  }

  async function handleValidateAuthorities() {
    if (researchSources.length === 0) return;
    setValidityLoading(true);
    setShowValidity(false);
    setValidityResult("");
    const sourceList = researchSources
      .map((s, i) => {
        const parts = [`${i + 1}. ${s.source_name}`];
        if (s.citation) parts.push(`Citation: ${s.citation}`);
        if (s.jurisdiction) parts.push(`Jurisdiction: ${s.jurisdiction}`);
        return parts.join(" | ");
      })
      .join("\n");
    const prompt = `You are a legal research assistant. For each authority listed below, provide its current validity status on a single line in this format:\n<Number>. <Name> — <Status> <Icon> — <One-sentence reason>\n\nStatus options:\n- Good Law ✓ (still valid and followed)\n- Caution ⚠ (limited, distinguished, or questioned)\n- Overruled ✗ (explicitly overruled or superseded)\n- Unable to verify (insufficient information)\n\nAuthorities:\n${sourceList}\n\nRespond with only the numbered list, no preamble.`;
    try {
      const result = await callAiChat([{ role: "user", content: prompt }], "drafting");
      setValidityResult(result);
      setShowValidity(true);
    } finally {
      setValidityLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Feature 16: AI Command Bar (Ctrl/Cmd+K) — acts directly on the document
  // ---------------------------------------------------------------------------
  async function handleCommandSubmit(instruction: string) {
    const editor = editorInstanceRef.current;
    if (!editor) return;
    setCommandLoading(true);
    setError("");
    try {
      const sel = editor.state.selection;
      const selText = !sel.empty ? editor.state.doc.textBetween(sel.from, sel.to, " ") : "";
      const userContent = selText
        ? `${instruction}\n\nApply this instruction to the following selected text and return ONLY the revised text, with no preamble or explanation:\n\n${selText}`
        : `${instruction}\n\nReturn ONLY the resulting legal text, with no preamble or explanation.`;
      const result = await callAiChat([{ role: "user", content: userContent }], "drafting");

      versions.push(draftContent, "Before AI command");
      if (selText) {
        editor.chain().focus().insertContentAt({ from: sel.from, to: sel.to }, result).run();
      } else {
        editor.chain().focus().insertContent(`\n\n${result}`).run();
      }
      setSaved(false);
      setShowCommandBar(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI command failed");
    } finally {
      setCommandLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  async function handleSave() {
    if (!user || !draftContent) return;
    setSaving(true);
    setError("");
    try {
      if (draftId) {
        const { error: updateErr } = await supabase.from("drafts").update({ content: draftContent, updated_at: new Date().toISOString() }).eq("id", draftId);
        if (updateErr) throw updateErr;
      } else {
        const { data: newDraft, error: insertErr } = await supabase.from("drafts").insert({
          user_id: user.id,
          title: selectedTemplate?.title ?? (nlPrompt ? nlPrompt.slice(0, 80) : "Untitled Draft"),
          template_type: selectedTemplate?.template_type ?? "natural_language",
          content: draftContent, jurisdiction: selectedTemplate?.jurisdiction ?? nlJurisdiction ?? "ghana", status: "draft",
        }).select().maybeSingle();
        if (insertErr) throw insertErr;
        if (newDraft) setDraftId(newDraft.id);
      }
      setSaved(true);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Copy, export, undo/redo, version restore, load draft
  // ---------------------------------------------------------------------------
  function handleCopy() {
    navigator.clipboard.writeText(draftContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const draftTitle = selectedTemplate?.title ?? (nlPrompt ? nlPrompt.slice(0, 60) : "Draft");

  async function handleExport(format: "txt" | "docx" | "pdf") {
    setShowExportMenu(false);
    if (format === "txt") {
      const blob = new Blob([draftContent], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${draftTitle}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    setExporting(true);
    setError("");
    try {
      if (format === "docx") await exportToWord(draftContent, draftTitle);
      else await exportToPdf("draft-content-area", draftTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleUndo() {
    const prev = versions.undo(draftContent);
    if (prev) { setDraftContent(prev.content); updateWordCount(prev.content); setSaved(false); }
  }
  function handleRedo() {
    const next = versions.redo(draftContent);
    if (next) { setDraftContent(next.content); updateWordCount(next.content); setSaved(false); }
  }
  function restoreVersion(version: DraftVersion) {
    versions.push(draftContent, "Before version restore");
    setDraftContent(version.content);
    updateWordCount(version.content);
    setSaved(false);
    setShowVersionHistory(false);
  }
  function loadDraft(draft: Draft) {
    setDraftContent(draft.content);
    setDraftId(draft.id);
    updateWordCount(draft.content);
    setLegalNotes("");
    setSaved(true);
    setSelectedTemplate(null);
    setAiResult("");
    setReviewItems([]);
    versions.clear();
    setMode("output");
  }

  function handleEditorChange(newContent: string) {
    setDraftContent(newContent);
    updateWordCount(newContent);
    setSaved(false);
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const grouped = groupByCategory(
    templates.filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
  );
  const canGenerate = selectedTemplate && Object.entries(variables).every(([k]) => {
    const varDef = selectedTemplate.variables?.find((vd) => vd.name === k);
    return !varDef?.required || (variables[k] ?? "").trim();
  });

  const hasSelection = !!selectedText;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AppLayout>
      <Header title="Drafting Studio" subtitle="AI-powered legal document workspace" />

      <CommandBar
        open={showCommandBar}
        onClose={() => setShowCommandBar(false)}
        onSubmit={handleCommandSubmit}
        loading={commandLoading}
        hasSelection={hasSelection}
      />

      <div className="flex-1 overflow-hidden flex relative">
        {/* Mobile left panel overlay */}
        {mobileLeftOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileLeftOpen(false)}
            aria-hidden="true"
          />
        )}
        
        {/* Mobile right panel overlay */}
        {mobileRightOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileRightOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ================================================================ */}
        {/* LEFT PANEL                                                       */}
        {/* ================================================================ */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex-col overflow-y-auto transition-transform duration-300 lg:static lg:w-64 lg:z-auto lg:translate-x-0 lg:flex ${
          mobileLeftOpen ? "translate-x-0 flex" : "-translate-x-full lg:flex hidden"
        }`}>
          <div className="flex items-center justify-between border-b border-slate-100">
            <div className="flex">
              {(["templates", "drafts"] as const).map((tab) => (
                <button key={tab} onClick={() => setLeftTab(tab)}
                  className={`px-4 py-3 text-xs font-semibold capitalize transition-colors ${leftTab === tab ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}>
                  {tab === "templates" ? "Templates" : "My Drafts"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMobileLeftOpen(false)}
              className="lg:hidden p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          {leftTab === "templates" && (
            <>
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..."
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {Object.entries(grouped).map(([cat, catTemplates]) => (
                  <div key={cat}>
                    <button onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      <span className="truncate">{cat}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-slate-300">{catTemplates.length}</span>
                        {expandedCategories.has(cat) ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </div>
                    </button>
                    {expandedCategories.has(cat) && (
                      <div className="ml-2 space-y-0.5 mb-1">
                        {catTemplates.map((t) => (
                          <button key={t.id} onClick={() => selectTemplate(t)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all ${selectedTemplate?.id === t.id ? "bg-navy-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                            <p className="font-medium leading-snug">{t.title}</p>
                            {t.framework && <p className={`mt-0.5 ${selectedTemplate?.id === t.id ? "text-navy-300" : "text-slate-400"}`}>{t.framework}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {Object.keys(grouped).length === 0 && (
                  <div className="py-8 text-center"><BookOpen size={20} className="text-slate-200 mx-auto mb-2" /><p className="text-xs text-slate-400">No templates found</p></div>
                )}
              </div>
            </>
          )}

          {leftTab === "drafts" && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {myDrafts.length === 0 ? (
                <div className="py-8 text-center"><FileText size={20} className="text-slate-200 mx-auto mb-2" /><p className="text-xs text-slate-400">No saved drafts yet</p></div>
              ) : myDrafts.map((d) => (
                <button key={d.id} onClick={() => loadDraft(d)} disabled={draftLoading}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${draftId === d.id ? "bg-navy-50 border-navy-200" : "hover:bg-slate-50 border-transparent hover:border-slate-200"}`}>
                  <p className="text-xs font-medium text-navy-950 line-clamp-1">{d.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">{d.template_type === "natural_language" ? "AI Draft" : d.template_type} · {d.jurisdiction}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* CENTER — WORKSPACE                                               */}
        {/* ================================================================ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          
          {/* Mobile toolbar */}
          <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200">
            <button
              onClick={() => setMobileLeftOpen(true)}
              className="p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Open templates"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-semibold text-navy-900 truncate max-w-[150px]">
              {mode === "prompt" ? "Drafting Studio" : mode === "template" ? selectedTemplate?.title : draftTitle}
            </span>
            {mode === "output" && (
              <button
                onClick={() => setMobileRightOpen(true)}
                className="p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Open AI tools"
              >
                <Wand2 size={18} />
              </button>
            )}
          </div>

          {/* PROMPT MODE */}
          {mode === "prompt" && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm mb-6">
                  <Scale size={28} className="text-navy-600" />
                </div>
                <h2 className="text-2xl font-bold text-navy-950 mb-2 text-center">What would you like to draft?</h2>
                <p className="text-sm text-slate-500 mb-8 text-center max-w-md">Describe your document in plain language. CIMA AI will generate a complete, professional legal document.</p>

                <form onSubmit={handleNlGenerate} className="w-full max-w-2xl">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <textarea ref={nlInputRef} value={nlPrompt} onChange={(e) => setNlPrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNlGenerate(); }}
                      rows={4} placeholder="e.g., Draft a Notice of Arbitration for a construction dispute involving delayed payment under a FIDIC contract between Accra Builders Ltd and Ministry of Roads..."
                      className="w-full px-5 py-4 text-sm text-navy-950 placeholder-slate-400 focus:outline-none resize-none border-0" />
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Globe size={13} className="text-slate-400" />
                          <select value={nlJurisdiction} onChange={(e) => setNlJurisdiction(e.target.value)}
                            className="text-xs text-navy-950 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer py-0 pl-0 pr-5">
                            {JURISDICTIONS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                          </select>
                        </div>
                        {cases.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase size={13} className="text-slate-400" />
                            <select value={nlLinkedCaseId} onChange={(e) => setNlLinkedCaseId(e.target.value)}
                              className="text-xs text-navy-950 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer py-0 pl-0 pr-5 max-w-[180px]">
                              <option value="">No matter linked</option>
                              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}{c.matter_number ? ` (${c.matter_number})` : ""}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                      <button type="submit" disabled={generating || !nlPrompt.trim()}
                        className="flex items-center gap-2 px-5 py-2 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate</>}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-mono text-xs">Ctrl+Enter</kbd> to generate
                  </p>
                </form>

                {error && (
                  <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mt-4 max-w-2xl w-full">
                    <AlertCircle size={14} className="shrink-0" />{error}
                  </div>
                )}

                <div className="mt-8 max-w-2xl w-full">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 text-center">Quick start</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <button key={chip} onClick={() => { setNlPrompt(`Draft a ${chip}`); nlInputRef.current?.focus(); }}
                        className="text-xs px-3.5 py-2 bg-white hover:bg-navy-50 text-slate-600 hover:text-navy-700 border border-slate-200 hover:border-navy-200 rounded-full transition-all flex items-center gap-1.5">
                        <ArrowRight size={10} className="text-slate-300" />{chip}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-10">Or select a template from the panel on the left</p>
              </div>
            </div>
          )}

          {/* TEMPLATE MODE */}
          {mode === "template" && selectedTemplate && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-xl mx-auto">
                <div className="mb-6">
                  <button onClick={handleNewDraft} className="text-xs text-slate-500 hover:text-navy-700 transition-colors mb-1">&larr; Back</button>
                  <h3 className="text-lg font-bold text-navy-950">{selectedTemplate.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5 capitalize">{selectedTemplate.category} · {selectedTemplate.jurisdiction}{selectedTemplate.framework ? ` · ${selectedTemplate.framework}` : ""}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                  {(selectedTemplate.variables ?? []).map((v) => (
                    <div key={v.name}>
                      <label className="block text-xs font-semibold text-navy-900 mb-1.5">{v.label}{v.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                      {v.description && <p className="text-xs text-slate-400 mb-1.5">{v.description}</p>}
                      {v.type === "textarea" ? (
                        <textarea value={variables[v.name] ?? ""} onChange={(e) => setVariables((p) => ({ ...p, [v.name]: e.target.value }))} rows={3}
                          placeholder={v.default ?? `Enter ${(v.label ?? v.name).toLowerCase()}...`}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none" />
                      ) : v.type === "select" && v.options ? (
                        <select value={variables[v.name] ?? ""} onChange={(e) => setVariables((p) => ({ ...p, [v.name]: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600">
                          <option value="">— Select —</option>
                          {v.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input type={v.type === "date" ? "date" : v.type === "number" ? "number" : "text"}
                          value={variables[v.name] ?? ""} onChange={(e) => setVariables((p) => ({ ...p, [v.name]: e.target.value }))}
                          placeholder={v.default ?? `Enter ${(v.label ?? v.name).toLowerCase()}...`}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600" />
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1.5"><Briefcase size={11} className="inline mr-1" />Link to Matter</label>
                    <select value={linkedCaseId} onChange={(e) => setLinkedCaseId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600">
                      <option value="">— No matter —</option>
                      {cases.map((c) => <option key={c.id} value={c.id}>{c.title}{c.matter_number ? ` (${c.matter_number})` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy-900 mb-1.5">Special Instructions</label>
                    <textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} rows={2} placeholder="Any specific requirements..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none" />
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mt-4"><AlertCircle size={13} className="shrink-0" />{error}</div>}
                <button onClick={handleGenerate} disabled={generating || !canGenerate}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-5 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Draft</>}
                </button>
              </div>
            </div>
          )}

          {/* OUTPUT MODE */}
          {mode === "output" && (
            <>
              {draftContent ? (
                <div className="flex-1 flex overflow-hidden">
                  {/* ---- Document area ---- */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <button onClick={handleNewDraft} className="flex items-center gap-1 text-xs text-slate-500 hover:text-navy-700 transition-colors" title="New Draft"><Plus size={13} /> New</button>
                        <div className="w-px h-4 bg-slate-200" />
                        <span className="text-xs font-semibold text-navy-900 max-w-[160px] truncate">{draftTitle}</span>
                        <span className="text-xs text-slate-400">{wordCount.toLocaleString()} words</span>
                        {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={11} /> Saved</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Output variant tabs: Full / Short / Plain */}
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden mr-1.5">
                          <button onClick={() => setOutputTab("full")}
                            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${outputTab === "full" ? "bg-navy-950 text-white" : "text-slate-500 hover:text-navy-700 hover:bg-slate-50"}`}>
                            Full
                          </button>
                          <button onClick={() => setOutputTab("short")} disabled={!shortForm}
                            className={`px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${outputTab === "short" ? "bg-navy-950 text-white" : "text-slate-500 hover:text-navy-700 hover:bg-slate-50"}`}
                            title="Short-form version">
                            Short
                          </button>
                          <button onClick={() => setOutputTab("plain")} disabled={!plainEnglish}
                            className={`px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${outputTab === "plain" ? "bg-navy-950 text-white" : "text-slate-500 hover:text-navy-700 hover:bg-slate-50"}`}
                            title="Plain-English summary">
                            Plain
                          </button>
                        </div>

                        {/* AI command bar trigger — only for Full tab */}
                        {outputTab === "full" && (
                          <button onClick={() => setShowCommandBar(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 mr-1 text-xs font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 border border-navy-100 rounded-lg transition-colors"
                            title="AI command bar (Ctrl/Cmd+K)">
                            <Sparkles size={12} className="text-gold-500" /> AI
                            <span className="text-[10px] text-navy-400 font-normal">⌘K</span>
                          </button>
                        )}

                        <button onClick={handleUndo} disabled={!versions.canUndo} className="p-1.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30" title="Undo"><Undo2 size={14} /></button>
                        <button onClick={handleRedo} disabled={!versions.canRedo} className="p-1.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30" title="Redo"><Redo2 size={14} /></button>
                        <div className="w-px h-4 bg-slate-200 mx-0.5" />
                        <button onClick={() => setShowVersionHistory(!showVersionHistory)} disabled={versions.past.length === 0}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${showVersionHistory ? "text-navy-700 bg-navy-50" : "text-slate-500 hover:text-navy-700 hover:bg-slate-100"}`} title="Version history"><History size={14} /></button>
                        <button onClick={handleCopy} className="p-1.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors" title="Copy"><Copy size={14} className={copied ? "text-emerald-500" : ""} /></button>

                        <div className="relative" ref={exportMenuRef}>
                          <button onClick={() => setShowExportMenu(!showExportMenu)} disabled={exporting}
                            className={`p-1.5 rounded-lg transition-colors ${showExportMenu ? "text-navy-700 bg-navy-50" : "text-slate-500 hover:text-navy-700 hover:bg-slate-100"}`} title="Export">
                            {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                          </button>
                          {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                              <button onClick={() => handleExport("pdf")} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Download size={12} className="text-red-500" /> Export as PDF</button>
                              <button onClick={() => handleExport("docx")} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Download size={12} className="text-blue-500" /> Export as Word</button>
                              <button onClick={() => handleExport("txt")} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Download size={12} className="text-slate-400" /> Export as Text</button>
                            </div>
                          )}
                        </div>

                        <button onClick={handleSave} disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 ml-1">
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                        </button>
                      </div>
                    </div>

                    {/* Version History Panel */}
                    {showVersionHistory && versions.past.length > 0 && (
                      <div className="border-b border-slate-200 bg-white max-h-40 overflow-y-auto">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 sticky top-0 bg-white">
                          <div className="flex items-center gap-2">
                            <History size={12} className="text-navy-600" />
                            <span className="text-xs font-semibold text-navy-900">Version History ({versions.past.length})</span>
                          </div>
                          <button onClick={() => setShowVersionHistory(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X size={12} /></button>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {[...versions.past].reverse().map((v, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 group">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-700 truncate">{v.action}</p>
                                <p className="text-xs text-slate-400">{v.timestamp.toLocaleTimeString()} · {v.content.split(/\s+/).filter(Boolean).length} words</p>
                              </div>
                              <button onClick={() => restoreVersion(v)} className="text-xs text-navy-600 hover:text-navy-800 font-medium px-2 py-1 rounded hover:bg-navy-50 opacity-0 group-hover:opacity-100 transition-opacity">Restore</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {error && <div className="flex items-center gap-2.5 mx-4 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle size={14} className="shrink-0" />{error}</div>}

                    {/* Editor / Preview content */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {outputTab !== "full" ? (
                        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                            {outputTab === "short" ? <FileText size={14} className="text-navy-600" /> : <Globe size={14} className="text-navy-600" />}
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {outputTab === "short" ? "Short-Form Version" : "Plain-English Summary"}
                            </span>
                          </div>
                          <div className="prose-doc text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {outputTab === "short" ? shortForm : plainEnglish}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-3xl mx-auto">
                          <LegalEditor
                            value={draftContent}
                            onChange={handleEditorChange}
                            onReady={(ed) => { editorInstanceRef.current = ed; }}
                            onSelectionTextChange={setSelectedText}
                            aiActions={AI_ACTIONS.slice(0, 6)}
                            onAiAction={(actionId) => {
                              const action = AI_ACTIONS.find((a) => a.id === actionId);
                              if (action) handleAiAction(action.id, action.prompt);
                            }}
                            aiActionLoading={aiActionLoading}
                            contentId="draft-content-area"
                          />

                          {legalNotes && (
                            <div className="max-w-3xl mx-auto mt-4 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2.5">
                                <Bot size={14} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Legal Notes</span>
                              </div>
                              <div className="prose-doc text-xs leading-relaxed text-amber-900">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{legalNotes}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ============================================================ */}
                  {/* RIGHT PANEL — AI Assistant / Review / Research               */}
                  {/* ============================================================ */}
                  <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 flex-col overflow-y-auto transition-transform duration-300 lg:static lg:w-72 lg:z-auto lg:translate-x-0 lg:flex ${
                    mobileRightOpen ? "translate-x-0 flex" : "translate-x-full lg:flex hidden"
                  }`}>
                    {/* Right panel tabs */}
                    <div className="flex items-center justify-between border-b border-slate-100">
                      <div className="flex">
                        {([
                          { id: "assistant" as const, icon: Wand2, label: "AI" },
                          { id: "review" as const, icon: ShieldCheck, label: "Review" },
                          { id: "research" as const, icon: Search, label: "Research" },
                          { id: "clauses" as const, icon: BookMarked, label: "Clauses" },
                        ]).map((tab) => (
                          <button key={tab.id} onClick={() => setRightTab(tab.id)}
                            className={`px-3 py-3 text-xs font-semibold transition-colors ${rightTab === tab.id ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}>
                            <tab.icon size={12} />{tab.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setMobileRightOpen(false)}
                        className="lg:hidden p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Close panel"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* ---- ASSISTANT TAB ---- */}
                    {rightTab === "assistant" && (
                      <div className="flex-1 overflow-y-auto">
                        {/* Status */}
                        {hasSelection && (
                          <div className="px-4 py-2.5 bg-navy-50 border-b border-navy-100">
                            <p className="text-xs text-navy-700 font-medium">Targeting: Selected text</p>
                            <p className="text-xs text-navy-500 mt-0.5 line-clamp-2">"{selectedText.slice(0, 100)}{selectedText.length > 100 ? "..." : ""}"</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">
                            {hasSelection ? "Apply to selection" : "Apply to document"}
                          </p>
                          {AI_ACTIONS.map((action) => (
                            <button key={action.id} onClick={() => handleAiAction(action.id, action.prompt)}
                              disabled={!!aiActionLoading}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${action.color}`}>
                              {aiActionLoading === action.id ? <Loader2 size={14} className="animate-spin" /> : <action.icon size={14} />}
                              {action.label}
                            </button>
                          ))}
                        </div>

                        {/* Custom AI prompt */}
                        <div className="px-3 pb-3 border-t border-slate-100 pt-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">Custom instruction</p>
                          <div className="flex gap-1.5">
                            <input
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              placeholder="e.g. Add indemnity clause..."
                              className="flex-1 px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && customPrompt.trim()) {
                                  handleAiAction("custom", customPrompt);
                                  setCustomPrompt("");
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* AI Result preview */}
                        {aiResult && (
                          <div className="px-3 pb-3 border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-navy-900">AI Result</p>
                              <div className="flex items-center gap-1">
                                <button onClick={applyAiResult}
                                  className="flex items-center gap-1 px-2 py-1 bg-navy-950 hover:bg-navy-800 text-white text-xs font-medium rounded-lg transition-colors">
                                  <CheckCircle2 size={11} /> Apply
                                </button>
                                <button onClick={() => setAiResult("")} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X size={12} /></button>
                              </div>
                            </div>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-60 overflow-y-auto">
                              <div className="prose-doc text-xs leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult.slice(0, 2000)}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---- REVIEW TAB (Feature 4) ---- */}
                    {rightTab === "review" && (
                      <div className="flex-1 overflow-y-auto">
                        <div className="p-3">
                          <button onClick={handleReview} disabled={reviewLoading || !draftContent}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                            {reviewLoading ? <><Loader2 size={13} className="animate-spin" /> Reviewing...</> : <><ShieldCheck size={13} /> Review Document</>}
                          </button>
                        </div>

                        {reviewLoading && (
                          <div className="px-4 py-8 text-center">
                            <Loader2 size={20} className="text-navy-600 animate-spin mx-auto mb-3" />
                            <p className="text-xs text-slate-500">Analyzing document for risks, ambiguities, and missing provisions...</p>
                          </div>
                        )}

                        {reviewItems.length > 0 && (
                          <div className="px-3 pb-3 space-y-2">
                            {/* Summary bar */}
                            <div className="flex items-center gap-2 px-2 py-2 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-xs font-medium text-slate-600">{reviewItems.length} findings</span>
                              <div className="flex items-center gap-1.5 ml-auto">
                                {["critical", "high", "medium", "low", "positive"].map((sev) => {
                                  const count = reviewItems.filter((r) => r.severity === sev).length;
                                  if (!count) return null;
                                  return <span key={sev} className="text-xs px-1.5 py-0.5 rounded-full bg-white border border-slate-200">{count}</span>;
                                })}
                              </div>
                            </div>

                            {/* Review items */}
                            {reviewItems.map((item, i) => (
                              <div key={i} className={`bg-white rounded-lg border border-slate-200 border-l-[3px] ${severityBorder(item.severity)} overflow-hidden`}>
                                <div className="p-3">
                                  <div className="flex items-start gap-2">
                                    {severityIcon(item.severity)}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-navy-950">{item.title}</p>
                                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
                                      {item.suggestion && (
                                        <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-100">
                                          <p className="text-xs text-slate-500 font-medium mb-0.5">Suggestion:</p>
                                          <p className="text-xs text-slate-700">{item.suggestion}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!reviewLoading && reviewItems.length === 0 && (
                          <div className="px-4 py-10 text-center">
                            <Shield size={24} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Click "Review Document" to analyze your draft for risks, ambiguities, and missing provisions.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---- RESEARCH TAB (Feature 5) ---- */}
                    {rightTab === "research" && (
                      <div className="flex-1 overflow-y-auto">
                        <form onSubmit={handleResearch} className="p-3">
                          <div className="flex gap-1.5">
                            <input value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)}
                              placeholder="Search legal authorities..."
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600" />
                            <button type="submit" disabled={researchLoading || !researchQuery.trim()}
                              className="px-3 py-2 bg-navy-950 hover:bg-navy-800 text-white rounded-lg transition-colors disabled:opacity-50">
                              {researchLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                            </button>
                          </div>
                        </form>

                        {researchLoading && (
                          <div className="px-4 py-8 text-center">
                            <Loader2 size={20} className="text-navy-600 animate-spin mx-auto mb-3" />
                            <p className="text-xs text-slate-500">Searching legal library, case databases, and live sources...</p>
                          </div>
                        )}

                        {researchAnalysis && (
                          <div className="px-3 pb-2">
                            <div className="p-3 bg-gold-50 border border-gold-200 rounded-lg">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles size={12} className="text-gold-600" />
                                <span className="text-xs font-bold text-gold-800">AI Analysis</span>
                              </div>
                              <div className="prose-doc text-xs leading-relaxed text-gold-900 max-h-40 overflow-y-auto">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{researchAnalysis.slice(0, 1500)}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        )}

                        {researchSources.length > 0 && (
                          <div className="px-3 pb-3 space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{researchSources.length} sources found</p>
                              <button
                                onClick={handleValidateAuthorities}
                                disabled={validityLoading || researchSources.length === 0}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {validityLoading ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                                Validate
                              </button>
                            </div>
                            {researchSources.map((source) => (
                              <div key={source.id} className="bg-white rounded-lg border border-slate-200 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-navy-950 line-clamp-1">{source.source_name}</p>
                                    {source.citation && <p className="text-xs text-slate-500 font-mono mt-0.5">{source.citation}</p>}
                                    <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">{source.content}</p>
                                  </div>
                                  {source.similarity !== undefined && (
                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">{Math.round(source.similarity * 100)}%</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <button onClick={() => insertCitation(source)}
                                    className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium transition-colors">
                                    <ArrowDown size={10} /> Insert
                                  </button>
                                  {source.url && (
                                    <a href={source.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                                      <ExternalLink size={10} /> Source
                                    </a>
                                  )}
                                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full capitalize border ${
                                    source.source_type === "case" ? "bg-blue-50 text-blue-600 border-blue-200" :
                                    source.source_type === "statute" ? "bg-teal-50 text-teal-600 border-teal-200" :
                                    "bg-slate-50 text-slate-500 border-slate-200"
                                  }`}>{source.source_type}</span>
                                </div>
                              </div>
                            ))}
                            {showValidity && validityResult && (
                              <div className="mt-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <ShieldCheck size={12} className="text-navy-600" />
                                    <span className="text-xs font-semibold text-navy-900">Authority Validity</span>
                                  </div>
                                  <button onClick={() => setShowValidity(false)} className="p-0.5 text-slate-400 hover:text-slate-600 rounded">
                                    <X size={12} />
                                  </button>
                                </div>
                                <pre className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{validityResult}</pre>
                              </div>
                            )}
                          </div>
                        )}

                        {!researchLoading && researchSources.length === 0 && !researchAnalysis && (
                          <div className="px-4 py-10 text-center">
                            <Database size={24} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Search legal authorities and insert citations directly into your document.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ---- CLAUSES TAB (C7) ---- */}
                    {rightTab === "clauses" && (
                      <div className="flex-1 overflow-y-auto flex flex-col">
                        {/* Mode toggle */}
                        <div className="flex border-b border-slate-100">
                          <button onClick={() => setClauseMode("library")}
                            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${clauseMode === "library" ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}>
                            Library
                          </button>
                          <button onClick={() => setClauseMode("suggest")}
                            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${clauseMode === "suggest" ? "text-navy-900 border-b-2 border-navy-900" : "text-slate-400 hover:text-slate-600"}`}>
                            Suggest
                          </button>
                        </div>

                        {clauseMode === "library" ? (
                          <>
                            <form onSubmit={handleClauseSearch} className="p-3">
                              <div className="flex gap-1.5">
                                <input value={clauseQuery} onChange={e => setClauseQuery(e.target.value)}
                                  placeholder="e.g. force majeure, indemnity..."
                                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600" />
                                <button type="submit" disabled={clauseLoading || !clauseQuery.trim()}
                                  className="px-3 py-2 bg-navy-950 hover:bg-navy-800 text-white rounded-lg transition-colors disabled:opacity-50">
                                  {clauseLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                </button>
                              </div>
                            </form>

                            {clauseLoading && (
                              <div className="px-4 py-8 text-center">
                                <Loader2 size={20} className="text-navy-600 animate-spin mx-auto mb-3" />
                                <p className="text-xs text-slate-500">Retrieving clause...</p>
                              </div>
                            )}

                            {clauseResult && !clauseLoading && (() => {
                              const v1 = clauseResult.match(/WORDING VARIANT 1[^:]*:\s*\n([\s\S]+?)(?=\*\*WORDING VARIANT 2|\*\*APPLICABLE|$)/i);
                              const v2 = clauseResult.match(/WORDING VARIANT 2[^:]*:\s*\n([\s\S]+?)(?=\*\*WORDING VARIANT 3|\*\*APPLICABLE|$)/i);
                              const v3 = clauseResult.match(/WORDING VARIANT 3[^:]*:\s*\n([\s\S]+?)(?=\*\*APPLICABLE|$)/i);
                              return (
                                <div className="px-3 pb-3 space-y-3">
                                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-44 overflow-y-auto">
                                    <div className="prose-doc text-xs leading-relaxed">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{clauseResult}</ReactMarkdown>
                                    </div>
                                  </div>
                                  {[v1, v2, v3].map((m, i) => m ? (
                                    <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                                        <span className="text-xs font-semibold text-slate-600">Variant {i + 1}</span>
                                        <button onClick={() => insertClauseVariant(m[1].trim())}
                                          className="flex items-center gap-1 text-xs text-navy-700 hover:text-navy-900 font-medium transition-colors">
                                          <Plus size={10} />Insert
                                        </button>
                                      </div>
                                      <div className="p-2.5 max-h-24 overflow-y-auto">
                                        <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">{m[1].trim().slice(0, 300)}{m[1].trim().length > 300 ? "…" : ""}</p>
                                      </div>
                                    </div>
                                  ) : null)}
                                </div>
                              );
                            })()}

                            {!clauseLoading && !clauseResult && (
                              <div className="px-4 py-10 text-center">
                                <BookMarked size={24} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Search any clause by name to get its definition, purpose, risks if omitted, and 3 wording variants.</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="p-3">
                              <button onClick={handleClauseSuggest} disabled={clauseLoading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                                {clauseLoading ? <><Loader2 size={13} className="animate-spin" />Analysing...</> : <><Sparkles size={13} />Suggest Clauses</>}
                              </button>
                              <p className="text-xs text-slate-400 text-center mt-2">Based on your current document type</p>
                            </div>
                            {clauseLoading && (
                              <div className="px-4 py-8 text-center">
                                <Loader2 size={20} className="text-navy-600 animate-spin mx-auto mb-3" />
                                <p className="text-xs text-slate-500">Analysing document and recommending clauses...</p>
                              </div>
                            )}
                            {clauseSuggestions && !clauseLoading && (
                              <div className="px-3 pb-3">
                                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles size={11} className="text-gold-600" />
                                    <span className="text-xs font-bold text-slate-700">Recommended Clauses</span>
                                  </div>
                                  <div className="prose-doc text-xs leading-relaxed max-h-80 overflow-y-auto">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{clauseSuggestions}</ReactMarkdown>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">Switch to Library to look up and insert any clause.</p>
                                </div>
                              </div>
                            )}
                            {!clauseLoading && !clauseSuggestions && (
                              <div className="px-4 py-10 text-center">
                                <Sparkles size={24} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Get context-aware clause recommendations based on your document type.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Loading / empty state */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  {generating ? (
                    <>
                      <div className="relative mb-5">
                        <Loader2 size={32} className="text-navy-600 animate-spin" />
                        <Sparkles size={14} className="text-gold-500 absolute -top-1.5 -right-1.5" />
                      </div>
                      <h3 className="text-base font-semibold text-navy-950 mb-2">CIMA AI is drafting your document...</h3>
                      <p className="text-sm text-slate-500 max-w-sm">This may take a moment. Your document is being grounded in real legal authorities.</p>
                      <div className="flex justify-center gap-6 mt-6">
                        {["DeepSeek AI", "Laws.Africa", "Legal Library"].map((s) => (
                          <div key={s} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-navy-300 animate-pulse" />
                            <span className="text-xs text-slate-400">{s}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <PenTool size={24} className="text-slate-200 mb-3" />
                      <p className="text-sm text-slate-400">No draft content</p>
                      <button onClick={handleNewDraft} className="mt-3 text-xs text-navy-600 hover:text-navy-800 font-medium">Start a new draft</button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
