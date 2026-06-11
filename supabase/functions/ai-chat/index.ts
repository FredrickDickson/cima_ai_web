import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  detectJurisdiction,
  extractLegalQuery,
  fetchLawsAfricaContext,
  COUNTRY_NAMES,
} from "../_shared/laws-africa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: Message[];
  context?: string;
  stream?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LAWS_AFRICA_API_KEY = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";

    const { messages, context = "general", stream = false }: ChatRequest = await req.json();

    const userQuery = extractLegalQuery(messages);
    const jurisdictionCode = detectJurisdiction(
      messages.findLast((m) => m.role === "user")?.content ?? ""
    );
    const jurisdictionLabel = COUNTRY_NAMES[jurisdictionCode]
      ?? (jurisdictionCode !== "gh" ? jurisdictionCode : "Ghana");
    const lawsContext = userQuery
      ? await fetchLawsAfricaContext(userQuery, LAWS_AFRICA_API_KEY, jurisdictionCode)
      : "";

    const systemPrompt = buildSystemPrompt(context, lawsContext, jurisdictionLabel);

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
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(context: string, lawsContext: string, jurisdiction = "Ghana"): string {
  const base = `You are CIMA AI, an elite AI-powered legal intelligence assistant designed for professional lawyers, arbitrators, mediators, and legal researchers. You have deep expertise in:

- Commercial and investment arbitration (ICC, UNCITRAL, LCIA, Ghana ADR Act 2010 / Act 798)
- Common law and civil law legal research
- Legal drafting (contracts, awards, procedural orders, briefs, motions)
- Contract review and risk analysis
- Comparative international law
- The New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards

DETECTED JURISDICTION: ${jurisdiction}

Core principles:
1. Always cite legal authority (statutes, case law, arbitration rules) when making legal claims — specific to ${jurisdiction} where applicable
2. Distinguish clearly between legal analysis and your own opinion
3. When Laws.Africa sources are provided below, treat them as primary authority and cite them where relevant
4. Only cite sources that are directly relevant to the jurisdiction and question — if a source is from a different jurisdiction and not applicable as comparative law, do not cite it
5. If you cannot find a relevant source, provide analysis based on your training knowledge and clearly state you are drawing on general legal knowledge
6. Never fabricate citations — if uncertain about a case name or statute, say so explicitly
7. When drafting, produce professional-grade legal language
8. Structure responses clearly with headers when providing detailed analysis`;

  const contextMap: Record<string, string> = {
    research: `\n\nCurrent mode: LEGAL RESEARCH. Focus on retrieving and synthesizing legal authorities for ${jurisdiction}, citing statutes and case law, and providing structured legal analysis with clear citation references.`,
    drafting: `\n\nCurrent mode: LEGAL DRAFTING. Focus on producing professional, ${jurisdiction}-law-compliant legal drafts. Use proper legal language, standard clause structures, and insert placeholder variables in [SQUARE BRACKETS] where specific details are needed.`,
    analysis: `\n\nCurrent mode: DOCUMENT ANALYSIS. Focus on extracting key issues, identifying risks, summarizing legal obligations, and flagging unusual or problematic provisions under ${jurisdiction} law.`,
    review: `\n\nCurrent mode: CONTRACT REVIEW. Focus on clause-by-clause analysis, risk scoring, unusual language detection, liability analysis, and practical recommendations under ${jurisdiction} law.`,
    arbitration: `\n\nCurrent mode: ARBITRATION MANAGEMENT. Focus on procedural requirements, applicable rules, timeline management, jurisdictional issues, and award enforcement considerations under ${jurisdiction} law.`,
    case_strategy: `\n\nCurrent mode: CASE STRATEGY. Focus on analyzing the specific case details provided, identifying legal strategies, procedural next steps, strengths, weaknesses, and relevant precedents under ${jurisdiction} law.`,
    general: `\n\nProvide comprehensive, professional legal assistance under ${jurisdiction} law across all areas of legal practice.`,
  };

  return base + (contextMap[context] ?? contextMap.general) + lawsContext;
}

