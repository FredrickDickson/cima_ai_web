import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

const lawsAfricaCountryMap: Record<string, string> = {
  ghana: "gh", kenya: "ke", "south africa": "za", nigeria: "ng",
  uganda: "ug", tanzania: "tz", zambia: "zm", zimbabwe: "zw",
  malawi: "mw", namibia: "na", botswana: "bw", rwanda: "rw",
  mauritius: "mu", eswatini: "sz", lesotho: "ls", mozambique: "mz",
};

/** Query Laws.Africa for relevant legislation to ground the AI response. */
async function fetchLawsAfricaContext(query: string, apiKey: string, jurisdiction?: string): Promise<string> {
  if (!apiKey) return "";
  try {
    const countryCode = lawsAfricaCountryMap[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh";
    const res = await fetch(
      `https://api.laws.africa/v3/search/?q=${encodeURIComponent(query)}&country=${countryCode}&page_size=3`,
      { headers: { "Authorization": `Token ${apiKey}` } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const results = (data.results ?? []).slice(0, 3);
    if (results.length === 0) return "";

    const entries = results.map((item: { title?: string; citation?: string; snippet?: string; content?: string; url?: string; frbr_uri?: string }, i: number) => {
      const title = item.title ?? "Untitled";
      const citation = item.citation ?? "";
      const snippet = item.snippet ?? item.content ?? "";
      const url = item.url ?? (item.frbr_uri ? `https://api.laws.africa${item.frbr_uri}` : "");
      return `[LA${i + 1}] ${title}${citation ? ` (${citation})` : ""}${url ? `\nSource: ${url}` : ""}\n${snippet}`;
    });

    return `\n\n--- Laws.Africa Legal Sources (Ghana) ---\n${entries.join("\n\n")}`;
  } catch {
    return "";
  }
}

/** Extract a concise search query from the last user message. */
function extractSearchQuery(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      // Use the first 200 chars of the last user message as the search query
      return messages[i].content.slice(0, 200);
    }
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DeepSeek API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LAWS_AFRICA_API_KEY = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";

    const { messages, context = "general", stream = false }: ChatRequest = await req.json();

    // Fetch Laws.Africa context based on the user's query
    const userQuery = extractSearchQuery(messages);
    const lawsContext = userQuery ? await fetchLawsAfricaContext(userQuery, LAWS_AFRICA_API_KEY) : "";

    const systemPrompt = buildSystemPrompt(context, lawsContext);

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
        JSON.stringify({ error: `DeepSeek API error: ${errorText}` }),
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
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(context: string, lawsContext: string): string {
  const base = `You are CIMA AI, an elite AI-powered legal intelligence assistant designed for professional lawyers, arbitrators, mediators, and legal researchers. You have deep expertise in:

- Commercial and investment arbitration (ICC, UNCITRAL, LCIA, Ghana ADR Act 2010 / Act 798)
- Common law and civil law legal research
- Legal drafting (contracts, awards, procedural orders, briefs, motions)
- Contract review and risk analysis
- Comparative international law
- The New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards

Core principles:
1. Always cite legal authority (statutes, case law, arbitration rules) when making legal claims
2. Distinguish clearly between legal analysis and your own opinion
3. Flag jurisdiction-specific considerations
4. When drafting, produce professional-grade legal language
5. Identify risks and flag unusual clauses in contracts
6. Structure responses clearly with headers when providing detailed analysis
7. Never fabricate citations — if uncertain, say so explicitly
8. When Laws.Africa sources are provided below, use them to ground your analysis in real legislation and cite them where relevant`;

  const contextMap: Record<string, string> = {
    research: `\n\nCurrent mode: LEGAL RESEARCH. Focus on retrieving and synthesizing legal authorities, citing statutes and case law, and providing structured legal analysis with clear citation references.`,
    drafting: `\n\nCurrent mode: LEGAL DRAFTING. Focus on producing professional, jurisdiction-aware legal drafts. Use proper legal language, standard clause structures, and insert placeholder variables in [SQUARE BRACKETS] where specific details are needed.`,
    analysis: `\n\nCurrent mode: DOCUMENT ANALYSIS. Focus on extracting key issues, identifying risks, summarizing legal obligations, and flagging unusual or problematic provisions.`,
    review: `\n\nCurrent mode: CONTRACT REVIEW. Focus on clause-by-clause analysis, risk scoring, unusual language detection, liability analysis, and practical recommendations.`,
    arbitration: `\n\nCurrent mode: ARBITRATION MANAGEMENT. Focus on procedural requirements, applicable rules, timeline management, jurisdictional issues, and award enforcement considerations.`,
    case_strategy: `\n\nCurrent mode: CASE STRATEGY. Focus on analyzing the specific case details provided, identifying legal strategies, procedural next steps, strengths, weaknesses, and relevant precedents for the matter at hand.`,
    general: `\n\nProvide comprehensive, professional legal assistance across all areas of legal practice.`,
  };

  return base + (contextMap[context] ?? contextMap.general) + lawsContext;
}
