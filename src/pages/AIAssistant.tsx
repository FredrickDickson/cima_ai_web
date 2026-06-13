import { useEffect, useRef, useState } from "react";
import {
  Bot, Send, Plus, Search, Scale, FileText, Gavel, Loader2,
  ChevronRight, MessageSquare, Sparkles, User, Clock, Trash2,
  Paperclip, X, Briefcase, ShieldAlert,
  PenTool, HandshakeIcon, Award, Target, Menu, Upload, Copy, Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppLayout from "../components/layout/AppLayout";
import { FileAttachment } from "../components/ui/FileAttachment";
import { extractTextFromFile } from "../lib/fileUtils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";

// Rendered inside AppLayout's SidebarProvider so useSidebar() works correctly
function AppMenuButton() {
  const { toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-md transition-colors shrink-0"
      aria-label="Open App Menu"
    >
      <Menu size={20} />
    </button>
  );
}

type AIConversation = {
  id: string;
  user_id: string;
  title: string;
  context: string;
  created_at: string;
  updated_at: string;
};

type AIMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  attachmentName?: string;
  attachmentSize?: number;
};

const CONTEXTS = [
  { value: "general", label: "General Legal", icon: Scale, desc: "General legal questions and advice" },
  { value: "research", label: "Legal Research", icon: Search, desc: "Case law, statutes, and legal research" },
  { value: "drafting", label: "Drafting", icon: PenTool, desc: "Draft legal documents and contracts" },
  { value: "analysis", label: "Doc Analysis", icon: Sparkles, desc: "Analyse uploaded legal documents" },
  { value: "review", label: "Contract Review", icon: FileText, desc: "Review and redline contracts" },
  { value: "arbitration", label: "Arbitration", icon: Gavel, desc: "International commercial arbitration" },
  { value: "case_strategy", label: "Case Strategy", icon: Target, desc: "Strategic advice for active cases" },
  { value: "settlement", label: "Settlement", icon: HandshakeIcon, desc: "Settlement strategy and negotiation" },
  { value: "evidence", label: "Evidence", icon: ShieldAlert, desc: "Evidence analysis and strategy" },
  { value: "award", label: "Award Drafting", icon: Award, desc: "Draft arbitral awards and orders" },
];

const STARTER_PROMPTS: Record<string, string[]> = {
  general: [
    "What are the key differences between arbitration and litigation in Ghana?",
    "Explain the doctrine of unconscionability under Ghanaian contract law",
    "What are the elements of a valid contract under the Contracts Act of Ghana?",
  ],
  research: [
    "What is the legal framework for international arbitration in Ghana?",
    "Find precedents on breach of confidentiality clauses in Ghanaian courts",
    "What does the New York Convention say about enforcement of foreign awards?",
  ],
  drafting: [
    "Draft a notice of arbitration under ICC Rules for a $5M construction dispute",
    "Draft a non-disclosure agreement for a commercial transaction in Ghana",
    "Draft an arbitration clause for a joint venture agreement governed by Ghanaian law",
  ],
  analysis: [
    "What are the key risks in this document?",
    "Identify any missing critical provisions",
    "Summarise the obligations of each party",
  ],
  review: [
    "Review a limitation of liability clause and assess its enforceability",
    "Is this force majeure clause sufficient to cover pandemic events?",
    "Does this termination clause comply with Ghanaian law?",
  ],
  arbitration: [
    "What are the grounds for challenging an arbitrator under ICC Rules?",
    "Explain kompetenz-kompetenz in international arbitration",
    "How do I enforce an ICC award in Ghana under the New York Convention?",
  ],
  case_strategy: [
    "What are the strongest legal arguments for this case?",
    "What procedural steps should I take next?",
    "Identify potential weaknesses in our position",
  ],
  settlement: [
    "Suggest a settlement framework for this dispute",
    "What BATNA considerations should I factor in?",
    "Draft a settlement term sheet outline",
  ],
  evidence: [
    "How should I structure the evidence bundle for the hearing?",
    "What evidentiary standard applies to this type of claim?",
    "Identify any gaps in the evidence gathered so far",
  ],
  award: [
    "Draft a summary of the tribunal's reasoning on jurisdiction",
    "What are the required elements of a final arbitral award under ICC Rules?",
    "Draft a procedural order on document production",
  ],
};

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: string) {
  const date = new Date(d);
  const today = new Date();
  const diff = today.getDate() - date.getDate();
  if (diff === 0 && date.getMonth() === today.getMonth()) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConv, setActiveConv] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("general");
  const [streaming, setStreaming] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [cases, setCases] = useState<{ id: string; title: string; matter_number?: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; name: string; ai_summary?: string }[]>([]);
  const [attachedCase, setAttachedCase] = useState<{ id: string; title: string } | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<{ id: string; name: string; ai_summary?: string } | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [uploadedDocSize, setUploadedDocSize] = useState<number | undefined>(undefined);
  const [uploadedDocText, setUploadedDocText] = useState<string | null>(null);
  const [extractingFile, setExtractingFile] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    loadConversations();
    if (user) {
      supabase.from("cases").select("id, title, matter_number").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
        .then(({ data }) => setCases(data ?? []));
      supabase.from("documents").select("id, name, ai_summary").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
        .then(({ data }) => setDocuments(data ?? []));
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    if (!user) return;
    setLoadingConvs(true);
    const { data } = await supabase.from("ai_conversations").select("*").eq("user_id", user.id)
      .order("updated_at", { ascending: false }).limit(30);
    setConversations(data ?? []);
    setLoadingConvs(false);
  }

  async function loadMessages(conv: AIConversation) {
    setActiveConv(conv);
    setContext(conv.context ?? "general");
    const { data } = await supabase.from("ai_messages").select("*").eq("conversation_id", conv.id).order("created_at");
    setMessages(data ?? []);
  }


  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show the chip immediately so the user sees it was picked
    setUploadedDocName(file.name);
    setUploadedDocSize(file.size);
    setExtractingFile(true);
    try {
      const text = await extractTextFromFile(file);
      setUploadedDocText(text);
    } catch (err) {
      console.error("Failed to extract text:", err);
      // chip stays visible even if extraction fails
      setUploadedDocText("[Failed to read document text. It may be an unsupported format or corrupted file.]");
    } finally {
      setExtractingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function startNewConversation() {
    setActiveConv(null);
    setMessages([]);
    setInput("");
    setAttachedCase(null);
    setAttachedDoc(null);
    setUploadedDocName(null);
    setUploadedDocSize(undefined);
    setUploadedDocText(null);
  }

  async function handleSend() {
    if ((!input.trim() && !uploadedDocText) || streaming || extractingFile || !user) return;

    let conv = activeConv;
    if (!conv) {
      const titleInput = input.trim() ? input.slice(0, 60) : (uploadedDocName ? `Analysis of ${uploadedDocName}` : "New Conversation");
      const { data, error: convErr } = await supabase.from("ai_conversations").insert({
        user_id: user.id,
        title: titleInput,
        context,
      } as any).select().single();
      if (convErr || !data) {
        console.error("Failed to create conversation:", convErr?.message);
        // Show error inline as a system message
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          conversation_id: "",
          role: "assistant",
          content: `Failed to start conversation: ${convErr?.message ?? "Unknown error"}. Please try again.`,
          created_at: new Date().toISOString(),
        }]);
        return;
      }
      conv = data as AIConversation;
      setActiveConv(conv);
      setConversations(prev => [conv!, ...prev]);
    }

    const defaultDocPrompt = "Please analyze the attached document and provide a summary of its key points.";
    const userText = input.trim() ? input : defaultDocPrompt;

    const messageContent = uploadedDocText
      ? `[Attached document: ${uploadedDocName}]\n\n${uploadedDocText.slice(0, 120000)}\n\n---\n\n${userText}`
      : userText;

    const sentAttachmentName = uploadedDocName;
    const sentAttachmentSize = uploadedDocSize;

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: conv.id,
      role: "user",
      content: messageContent,
      created_at: new Date().toISOString(),
      attachmentName: sentAttachmentName ?? undefined,
      attachmentSize: sentAttachmentSize,
    };

    setMessages(prev => [...prev, userMsg]);
    const sentInput = userText;
    setInput("");
    setUploadedDocName(null);
    setUploadedDocSize(undefined);
    setUploadedDocText(null);

    // Save user message to DB (non-blocking)
    supabase.from("ai_messages").insert({ conversation_id: conv.id, role: "user", content: userMsg.content } as any)
      .then(({ error }) => { if (error) console.error("Failed to save message:", error.message); });

    setStreaming(true);

    const assistantMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      conversation_id: conv!.id,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Session expired. Please refresh the page and log in again.");
      }

      // Build history from messages before the current turn (userMsg is already in state)
      const history = messages.slice(-10).filter(m => m.id !== userMsg.id).map(m => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: userMsg.content });

      const body: Record<string, unknown> = {
        messages: history,
        context,
        conversation_id: conv.id,
        user_id: user.id,
      };
      if (attachedCase) body.case_id = attachedCase.id;
      if (attachedDoc) body.document_id = attachedDoc.id;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`AI service error (${res.status}): ${errBody || res.statusText}`);
      }

      const data = await res.json();
      const content: string = data.content ?? data.choices?.[0]?.message?.content ?? data.response ?? data.message ?? "I encountered an issue processing your request.";

      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content } : m));
      await supabase.from("ai_messages").insert({ conversation_id: conv.id, role: "assistant", content } as any);

      const newTitle = messages.length === 0 ? sentInput.slice(0, 60) : conv.title;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("ai_conversations") as any).update({ title: newTitle, updated_at: new Date().toISOString() }).eq("id", conv.id);
      setConversations(prev => prev.map(c => c.id === conv!.id ? { ...c, title: newTitle, updated_at: new Date().toISOString() } : c));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `Error: ${errorMsg}` } : m));
    } finally {
      setStreaming(false);
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from("ai_conversations").delete().eq("id", id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConv?.id === id) { setActiveConv(null); setMessages([]); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function copyToClipboard(id: string, text: string) {
    // Try to copy formatted HTML if possible, fallback to plain text
    const elem = document.getElementById(`msg-${id}`);
    if (elem) {
      try {
        const html = elem.innerHTML;
        const blobInput = new Blob([text], { type: 'text/plain' });
        const blobHtml = new Blob([html], { type: 'text/html' });
        const data = [new ClipboardItem({ 'text/plain': blobInput, 'text/html': blobHtml })];
        navigator.clipboard.write(data).catch(() => {
          navigator.clipboard.writeText(text).catch(() => {});
        });
      } catch (err) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const contextInfo = CONTEXTS.find(c => c.value === context);
  const starters = STARTER_PROMPTS[context] ?? STARTER_PROMPTS.general;

  return (
    <AppLayout>
      <div className="flex-1 overflow-hidden flex h-full bg-navy-950 relative">
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        
        {/* ── Sidebar — hidden on mobile, drawer on mobile ── */}
        <div className={`fixed inset-y-0 left-0 z-50 w-full sm:w-72 border-r border-navy-800 bg-navy-900 flex-col overflow-y-auto transition-transform duration-300 md:static md:w-64 md:z-auto md:translate-x-0 md:flex ${
          mobileSidebarOpen ? "translate-x-0 flex" : "-translate-x-full md:flex hidden"
        }`}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-navy-800">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-gold-400" />
              <span className="text-sm font-semibold text-white">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={startNewConversation} className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors" title="New conversation">
                <Plus size={15} />
              </button>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Context selector */}
          <div className="px-3 py-3 border-b border-navy-800">
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Mode</p>
            <div className="space-y-0.5">
              {CONTEXTS.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setContext(value)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${context === value ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-slate-400 hover:text-white hover:bg-navy-800"}`}>
                  <Icon size={12} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loadingConvs ? (
              <div className="flex justify-center py-6"><Loader2 size={16} className="text-slate-500 animate-spin" /></div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare size={24} className="text-navy-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No conversations yet</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button key={conv.id} onClick={() => loadMessages(conv)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all group flex items-start gap-2 ${activeConv?.id === conv.id ? "bg-gold-500/10 border border-gold-500/20" : "hover:bg-navy-800"}`}>
                  <MessageSquare size={11} className="text-slate-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 line-clamp-2 leading-snug">{conv.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={9} className="text-slate-600" />
                      <span className="text-xs text-slate-600">{formatDate(conv.updated_at)}</span>
                    </div>
                  </div>
                  <button onClick={e => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition-all shrink-0">
                    <Trash2 size={11} />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-navy-800 bg-navy-900/60 relative z-20">
            <AppMenuButton />
            
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-md transition-colors shrink-0"
              aria-label="Open Chat History"
            >
              <MessageSquare size={20} />
            </button>

            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/10 shrink-0 ml-1">
              {contextInfo ? <contextInfo.icon size={15} className="text-gold-400" /> : <Bot size={15} className="text-gold-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">CIMA AI — {contextInfo?.label ?? "Legal Assistant"}</p>
              <p className="text-xs text-slate-500">{contextInfo?.desc ?? "Legal AI assistant"}</p>
            </div>
            {(attachedCase || attachedDoc) && (
              <div className="flex items-center gap-2">
                {attachedCase && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-navy-800 border border-navy-700 rounded-lg">
                    <Briefcase size={11} className="text-gold-400" />
                    <span className="text-xs text-slate-300 truncate max-w-[100px]">{attachedCase.title}</span>
                    <button onClick={() => setAttachedCase(null)} className="text-slate-500 hover:text-red-400"><X size={10} /></button>
                  </div>
                )}
                {attachedDoc && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-navy-800 border border-navy-700 rounded-lg">
                    <FileText size={11} className="text-gold-400" />
                    <span className="text-xs text-slate-300 truncate max-w-[100px]">{attachedDoc.name}</span>
                    <button onClick={() => setAttachedDoc(null)} className="text-slate-500 hover:text-red-400"><X size={10} /></button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {!activeConv && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center pb-10">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 mb-4 border border-gold-500/20">
                  <Scale size={22} className="text-gold-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">CIMA Legal AI</h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-2">{contextInfo?.desc ?? "Powered by CIMA AI with legal domain expertise."}</p>
                <p className="text-xs text-slate-600 mb-6">Ask about arbitration, contracts, case law, drafting, and more.</p>
                <div className="grid gap-2 w-full">
                  {starters.map(p => (
                    <button key={p} onClick={() => setInput(p)}
                      className="flex items-center gap-2.5 text-left px-4 py-3 bg-navy-800/50 rounded-xl border border-navy-700 hover:border-gold-500/30 hover:bg-navy-800 transition-all text-xs text-slate-400 hover:text-slate-200 group">
                      <ChevronRight size={12} className="text-gold-500/60 shrink-0 group-hover:text-gold-400" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 ${msg.role === "user" ? "bg-navy-700 border border-navy-600" : "bg-gold-500/10 border border-gold-500/20"}`}>
                      {msg.role === "user" ? <User size={13} className="text-slate-300" /> : <Bot size={13} className="text-gold-400" />}
                    </div>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-navy-800 border border-navy-700 text-slate-200 rounded-tr-sm" : "bg-navy-800/40 border border-navy-700 text-slate-300 rounded-tl-sm"}`}>
                      {msg.content === "" && streaming ? (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      ) : msg.role === "assistant" ? (
                        <div id={`msg-${msg.id}`} className="prose-ai text-sm leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {msg.attachmentName && (
                            <FileAttachment
                              id={`${msg.id}-attach`}
                              filename={msg.attachmentName}
                              size={msg.attachmentSize}
                            />
                          )}
                          {(() => {
                            // Strip the embedded doc prefix from the visible text
                            const docPrefix = msg.attachmentName
                              ? `[Attached document: ${msg.attachmentName}]\n\n`
                              : null;
                            const separator = "\n\n---\n\n";
                            let visible = msg.content;
                            if (docPrefix && visible.startsWith(docPrefix)) {
                              const sepIdx = visible.indexOf(separator);
                              visible = sepIdx !== -1 ? visible.slice(sepIdx + separator.length) : "";
                            }
                            return visible
                              ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{visible}</p>
                              : null;
                          })()}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs text-slate-600">{formatTime(msg.created_at)}</p>
                        {msg.role === "assistant" && msg.content && (
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.content)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            <span className="sr-only">Copy</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Attachment panel */}
          {showAttach && (
            <div className="mx-6 mb-2 p-4 bg-navy-900 border border-navy-700 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">Attach Context</span>
                <button onClick={() => setShowAttach(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Briefcase size={10} />Case</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {cases.map(c => (
                      <button key={c.id} onClick={() => { setAttachedCase(c); setShowAttach(false); }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${attachedCase?.id === c.id ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-slate-400 hover:bg-navy-800 hover:text-white"}`}>
                        <p className="font-medium truncate">{c.title}</p>
                        {c.matter_number && <p className="text-slate-600 font-mono">{c.matter_number}</p>}
                      </button>
                    ))}
                    {cases.length === 0 && <p className="text-xs text-slate-600">No cases found.</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><FileText size={10} />Document</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {documents.map(d => (
                      <button key={d.id} onClick={() => { setAttachedDoc(d); setShowAttach(false); }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${attachedDoc?.id === d.id ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-slate-400 hover:bg-navy-800 hover:text-white"}`}>
                        <p className="font-medium truncate">{d.name}</p>
                      </button>
                    ))}
                    {documents.length === 0 && <p className="text-xs text-slate-600">No documents found.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-6 py-4 border-t border-navy-800 bg-navy-900/40">
            <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileUpload} />
            {(uploadedDocName || attachedDoc || attachedCase) && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {attachedCase && (
                  <div className="relative flex items-center gap-2 pl-1 pr-2 py-1 min-w-[120px] max-w-[200px] bg-navy-800/80 rounded-[6px] border border-navy-700 shadow-sm group">
                    <div className="flex items-center justify-center w-8 h-8 self-stretch bg-navy-900 shrink-0 rounded-[4px]">
                      <Briefcase className="size-4 text-gold-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-slate-200 truncate" title={attachedCase.title}>{attachedCase.title}</span>
                      <span className="text-[10px] text-slate-500">Case Matter</span>
                    </div>
                    <button onClick={() => setAttachedCase(null)} className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-navy-900 border border-navy-700 flex items-center justify-center transition-opacity duration-150 ease-out z-10 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100">
                      <X size={12} />
                    </button>
                  </div>
                )}
                {attachedDoc && (
                  <FileAttachment
                    filename={attachedDoc.name}
                    onRemove={() => setAttachedDoc(null)}
                  />
                )}
                {uploadedDocName && (
                  <FileAttachment
                    filename={uploadedDocName}
                    size={uploadedDocSize}
                    onRemove={() => { setUploadedDocName(null); setUploadedDocText(null); setUploadedDocSize(undefined); }}
                    className={extractingFile ? "opacity-50 animate-pulse pointer-events-none" : ""}
                  />
                )}
              </div>
            )}
            <div className="flex items-end gap-2 bg-navy-800 border border-navy-700 rounded-2xl px-3 py-2.5 focus-within:border-gold-500/40 transition-all">
              <button onClick={() => setShowAttach(p => !p)}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${showAttach || attachedCase || attachedDoc ? "text-gold-400 bg-gold-500/10" : "text-slate-500 hover:text-slate-300 hover:bg-navy-700"}`}
                title="Attach case or document">
                <Paperclip size={15} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={extractingFile}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${uploadedDocName ? "text-gold-400 bg-gold-500/10" : "text-slate-500 hover:text-slate-300 hover:bg-navy-700"} disabled:opacity-40`}
                title="Upload document for AI context">
                {extractingFile ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              </button>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                rows={1} placeholder={`Ask CIMA AI${contextInfo ? ` — ${contextInfo.label}` : ""}...`}
                className="flex-1 text-sm text-slate-200 placeholder-slate-600 bg-transparent focus:outline-none resize-none max-h-36 leading-relaxed py-0.5"
                style={{ minHeight: "24px" }} />
              <button onClick={handleSend} disabled={(!input.trim() && !uploadedDocText) || streaming || extractingFile}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-xs text-slate-600 text-center mt-2">AI responses are for legal assistance only. Verify all citations independently.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
