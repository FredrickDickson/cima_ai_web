import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  detectJurisdiction,
  extractLegalQuery,
  fetchLawsAfricaSources,
  COUNTRY_NAMES,
  type LawsAfricaSource,
} from "../_shared/laws-africa.ts";
import { CIMA_SYSTEM_PROMPT } from "../_shared/cima-system-prompt.ts";
import { fetchTaggedAuthorityContext } from "../_shared/tagged-authorities.ts";
import { buildStrictGroundingBlock } from "../_shared/strict-grounding.ts";
import { searchLegalLibrary, searchTavily, type RetrievedLibrarySource, type TavilyResult } from "../_shared/legal-retrieval.ts";
import { rewriteQueryForRetrieval } from "../_shared/query-rewrite.ts";
import { validateCitations, markerSetFrom } from "../_shared/validate-citations.ts";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/http-error.ts";
import { optionalUUID, optionalUUIDArray, requireArray, optionalEnum } from "../_shared/validate.ts";

interface CitedSource {
  marker: string;
  source_name: string;
  citation?: string;
  source_type?: string;
  jurisdiction?: string;
  content: string;
  url?: string;
  doc_id?: string;
}

interface AccraRuleRow {
  id: string;
  title: string;
  content: string;
  citation: string;
  doc_id?: string;
}

async function fetchAccraRulesRows(query: string): Promise<AccraRuleRow[]> {
  if (!query) return [];
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return [];
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.rpc("search_legal_library_fts", {
      search_query: query,
      match_count: 4,
    });
    if (error || !data) return [];
    return (data as AccraRuleRow[]).slice(0, 4);
  } catch {
    return [];
  }
}

function formatAccraRulesContext(rows: AccraRuleRow[]): string {
  if (rows.length === 0) return "";
  const entries = rows.map((r, i) => `[R${i + 1}] ${r.citation ?? r.title}\n${(r.content ?? "").slice(0, 400)}`);
  return `\n\nRelevant Accra Arbitration Rules 2025:\n${entries.join("\n\n")}`;
}

const CONTEXTS = [
  "research", "drafting", "analysis", "review", "arbitration",
  "case_strategy", "settlement", "evidence", "award", "general",
] as const;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: Message[];
  context?: string;
  stream?: boolean;
  /** @deprecated superseded by library_doc_ids; still merged in for in-flight clients. */
  library_doc_id?: string;
  library_doc_ids?: string[];
  document_ids?: string[];
  user_id?: string;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const verifiedUser = await requireUser(req);

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const LAWS_AFRICA_API_KEY = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";
    const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await enforceRateLimit(supabase, verifiedUser.id, "ai-chat", 20, 60);

    const body: ChatRequest = await req.json();
    const messages = requireArray(body.messages, "messages", {
      maxItems: 50,
      itemValidator: (m) => {
        if (typeof m !== "object" || m === null) throw new Error("messages[] must be objects");
        const msg = m as Message;
        if (!["user", "assistant", "system"].includes(msg.role)) throw new Error("invalid message role");
        if (typeof msg.content !== "string" || msg.content.length > 20000) {
          throw new Error("message content must be a string up to 20000 characters");
        }
        return msg;
      },
    });
    const context = optionalEnum(body.context, "context", CONTEXTS) ?? "general";
    const stream = body.stream === true;
    const library_doc_id = optionalUUID(body.library_doc_id, "library_doc_id");
    const library_doc_ids = optionalUUIDArray(body.library_doc_ids, "library_doc_ids");
    const document_ids = optionalUUIDArray(body.document_ids, "document_ids");
    const user_id = verifiedUser.id;

    const userQuery = extractLegalQuery(messages);
    const jurisdictionCode = detectJurisdiction(
      messages.findLast((m) => m.role === "user")?.content ?? ""
    );
    const jurisdictionLabel = COUNTRY_NAMES[jurisdictionCode]
      ?? (jurisdictionCode !== "gh" ? jurisdictionCode : "Ghana");

    // Strict grounding: when the user has @-tagged specific cases/legislation/
    // documents (or opened a single Legal Library document, the older
    // library_doc_id path), skip the general Laws.Africa/Accra Rules lookups
    // and answer only from the tagged sources.
    const mergedLibraryDocIds = [
      ...(library_doc_id ? [library_doc_id] : []),
      ...(library_doc_ids ?? []),
    ];
    const taggedContext = (mergedLibraryDocIds.length > 0 || (document_ids?.length ?? 0) > 0)
      ? await fetchTaggedAuthorityContext(supabase, user_id, mergedLibraryDocIds, document_ids)
      : null;

    const RULES_CONTEXTS = ["arbitration", "drafting", "research", "review", "settlement", "evidence", "award"];
    // Follow-up questions ("what about interim measures?") depend on earlier
    // turns — extractLegalQuery() only looks at the last message, so on a
    // multi-turn conversation, fold the conversation into a standalone
    // retrieval query before searching. Falls back to the plain extraction
    // if the rewrite call fails or there's no history yet.
    const retrievalQuery = (!taggedContext && userQuery && messages.length > 1)
      ? (await rewriteQueryForRetrieval(messages, DEEPSEEK_API_KEY)) ?? userQuery
      : userQuery;

    // Every mode searches the full legal-library corpus (case law + statutes)
    // and the web, matching what the standalone Research page already does —
    // previously only Laws.Africa legislation was fetched, and only for
    // "research" mode.
    const [lawsSources, accraRows, librarySources, webResults]: [LawsAfricaSource[], AccraRuleRow[], RetrievedLibrarySource[], TavilyResult[]] = taggedContext
      ? [[], [], [], []]
      : await Promise.all([
          retrievalQuery ? fetchLawsAfricaSources(retrievalQuery, LAWS_AFRICA_API_KEY, jurisdictionCode) : Promise.resolve([]),
          (retrievalQuery && RULES_CONTEXTS.includes(context)) ? fetchAccraRulesRows(retrievalQuery) : Promise.resolve([]),
          retrievalQuery ? searchLegalLibrary(retrievalQuery, supabase, { hfKey: HUGGINGFACE_API_KEY, jurisdiction: jurisdictionCode, matchCount: 6 }) : Promise.resolve([]),
          retrievalQuery ? searchTavily(retrievalQuery, jurisdictionLabel, TAVILY_API_KEY) : Promise.resolve([]),
        ]);

    const lawsContext = lawsSources.length > 0
      ? `\n\nRelevant Laws.Africa Legal Sources:\n${lawsSources
          .map((s, i) => `[${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}\n${s.content}`)
          .join("\n\n")}`
      : "";
    const accraContext = formatAccraRulesContext(accraRows);

    const libraryContext = librarySources.length > 0
      ? `\n\nRelevant Case Law & Legal Library Sources:\n${librarySources
          .map((s, i) => `[C${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}\n${s.content.slice(0, 800)}`)
          .join("\n\n")}`
      : "";

    const webContext = webResults.length > 0
      ? `\n\nRelevant Web Sources:\n${webResults
          .map((r, i) => `[W${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content.slice(0, 600)}`)
          .join("\n\n")}`
      : "";

    const citedSources: CitedSource[] = [
      ...lawsSources.map((s, i) => ({
        marker: `${i + 1}`,
        source_name: s.source_name,
        citation: s.citation,
        source_type: s.source_type,
        jurisdiction: s.jurisdiction,
        content: s.content,
        url: s.url,
      })),
      ...accraRows.map((r, i) => ({
        marker: `R${i + 1}`,
        source_name: r.title,
        citation: r.citation,
        content: r.content,
        doc_id: r.doc_id,
      })),
      ...librarySources.map((s, i) => ({
        marker: `C${i + 1}`,
        source_name: s.source_name,
        citation: s.citation,
        source_type: s.source_type,
        jurisdiction: s.jurisdiction,
        content: s.content,
        doc_id: s.doc_id,
      })),
      ...webResults.map((r, i) => ({
        marker: `W${i + 1}`,
        source_name: r.title,
        content: r.content,
        url: r.url,
      })),
      ...(taggedContext?.citedSources ?? []),
    ];

    const strictGroundingBlock = taggedContext
      ? buildStrictGroundingBlock(taggedContext.titles, taggedContext.context)
      : "";

    const systemPrompt = buildSystemPrompt(context, lawsContext, jurisdictionLabel, accraContext, libraryContext, webContext) + strictGroundingBlock;

    const allMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: allMessages,
        stream,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `AI service error: ${errorText}` }),
        { status: response.status, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      // No citation_warnings on the streaming path — validating would mean
      // buffering the entire streamed response before forwarding any of it,
      // which defeats the point of streaming. Only the non-streaming path
      // below gets server-side citation validation.
      // cited_sources never appears in DeepSeek's own stream (it's our data,
      // not the model's) — prepend one custom SSE frame carrying it before
      // piping DeepSeek's chunks through untouched, so the frontend can pull
      // it out before parsing the rest as normal delta events.
      const metaFrame = `data: ${JSON.stringify({ __meta: { cited_sources: citedSources } })}\n\n`;
      const upstream = response.body!;
      const combined = new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode(metaFrame));
          const reader = upstream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            controller.close();
          }
        },
      });
      return new Response(combined, {
        headers: {
          ...cors,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const citation_warnings = validateCitations(content, markerSetFrom(citedSources));
    return new Response(JSON.stringify({ content, cited_sources: citedSources, citation_warnings }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse(err, cors);
  }
});

function buildSystemPrompt(context: string, lawsContext: string, jurisdiction = "Ghana", accraContext = "", libraryContext = "", webContext = ""): string {
  const base = CIMA_SYSTEM_PROMPT + `\n\nDETECTED JURISDICTION: ${jurisdiction}\n\nAdditional citation principles:\n1. Always cite legal authority (statutes, case law, arbitration rules) when making legal claims — specific to ${jurisdiction} where applicable\n2. Distinguish clearly between legal analysis and your own opinion\n3. When Laws.Africa sources are provided below, treat them as primary authority and cite them where relevant\n4. Only cite sources that are directly relevant to the jurisdiction and question — if a source is from a different jurisdiction and not applicable as comparative law, do not cite it\n5. If you cannot find a relevant source, provide analysis based on your training knowledge and clearly state you are drawing on general legal knowledge\n6. Never fabricate citations — if uncertain about a case name or statute, say so explicitly\n7. When drafting, produce professional-grade legal language\n8. Structure responses clearly with headers when providing detailed analysis`;

  const contextMap: Record<string, string> = {
    research: `\n\nCurrent mode: LEGAL RESEARCH. Focus on retrieving and synthesizing legal authorities for ${jurisdiction}, citing statutes and case law, and providing structured legal analysis with clear citation references.`,
    drafting: `\n\nCurrent mode: LEGAL DRAFTING. Focus on producing professional, ${jurisdiction}-law-compliant legal drafts. Use proper legal language, standard clause structures, and insert placeholder variables in [SQUARE BRACKETS] where specific details are needed.`,
    analysis: `\n\nCurrent mode: DOCUMENT ANALYSIS. Focus on extracting key issues, identifying risks, summarizing legal obligations, and flagging unusual or problematic provisions under ${jurisdiction} law.`,
    review: `\n\nCurrent mode: CONTRACT REVIEW. Focus on clause-by-clause analysis, risk scoring, unusual language detection, liability analysis, and practical recommendations under ${jurisdiction} law.`,
    arbitration: `\n\nCurrent mode: ARBITRATION MANAGEMENT. Focus on procedural requirements, applicable rules, timeline management, jurisdictional issues, and award enforcement considerations under ${jurisdiction} law.`,
    case_strategy: `\n\nCurrent mode: CASE STRATEGY. Focus on analyzing the specific case details provided, identifying legal strategies, procedural next steps, strengths, weaknesses, and relevant precedents under ${jurisdiction} law.`,
    settlement: `\n\nCurrent mode: SETTLEMENT & NEGOTIATION. Focus on settlement strategy, BATNA/WATNA analysis, negotiation frameworks, term sheet structuring, and mediation preparation under ${jurisdiction} law. Weigh commercial risk against the cost and likely outcome of continued litigation or arbitration.`,
    evidence: `\n\nCurrent mode: EVIDENCE ANALYSIS. Focus on evidentiary standards and burden of proof, admissibility, evidence bundle structuring, witness statement strategy, identifying evidentiary gaps, and disclosure/discovery obligations under ${jurisdiction} law.`,
    award: `\n\nCurrent mode: AWARD & ORDER DRAFTING. Focus on drafting arbitral awards, procedural orders, and tribunal directions — structuring findings of fact, legal reasoning, and dispositive relief in a form that is clear and enforceable under ${jurisdiction} law and the New York Convention where applicable.`,
    general: `\n\nProvide comprehensive, professional legal assistance under ${jurisdiction} law across all areas of legal practice.`,
  };

  const citationFormatNote = (lawsContext || accraContext || libraryContext || webContext)
    ? `\n\nWhen citing the sources listed below, use the exact bracket marker shown before each source (e.g. "[1]", "[R1]", "[C1]", "[W1]") inline in your answer — these markers are matched back to the real source and rendered as verifiable links, so do not invent marker numbers beyond what is listed.`
    : "";

  return base + (contextMap[context] ?? contextMap.general) + citationFormatNote + lawsContext + accraContext + libraryContext + webContext;
}

