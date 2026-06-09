import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchLawsAfricaContext, COUNTRY_MAP } from "../_shared/laws-africa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Industry-specific review focus
// ---------------------------------------------------------------------------
const INDUSTRY_FOCUS: Record<string, string> = {
  commercial: "standard commercial contract risks including payment terms, liability caps, indemnities, and force majeure",
  construction: "construction-specific risks including delay provisions, variation clauses, payment certification, defects liability, performance bonds, and dispute boards",
  employment: "employment law compliance including termination rights, restrictive covenants, transfer protections, discrimination provisions, and statutory entitlements",
  technology: "technology contract risks including IP ownership, data protection compliance, SLA provisions, source code escrow, and liability for software defects",
  "joint venture": "JV-specific risks including deadlock mechanisms, exit provisions, tag-along/drag-along rights, reserved matters, and management structure",
  shareholder: "shareholder agreement risks including pre-emption rights, minority protections, dividend policies, anti-dilution provisions, and drag-along mechanics",
  real_estate: "real estate contract risks including title, encumbrances, planning conditions, vacant possession, and completion mechanics",
  finance: "finance agreement risks including events of default, acceleration rights, security enforcement, financial covenants, and MAC clauses",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, document_id, case_id, user_id, industry_type, jurisdiction } = await req.json();
    if (!text || !user_id) throw new Error("text and user_id are required");

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const excerpt = text.slice(0, 20000);
    const industryFocus = INDUSTRY_FOCUS[industry_type ?? "commercial"] ?? INDUSTRY_FOCUS.commercial;

    const countryCode = COUNTRY_MAP[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh";
    const lawsQuery = `contract ${industry_type ?? "commercial"} law ${jurisdiction ?? "ghana"}`;
    const lawsContext = await fetchLawsAfricaContext(lawsQuery, lawsAfricaKey, countryCode);

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{
          role: "user",
          content: `You are a senior contract review lawyer specialising in ${jurisdiction ?? "Ghanaian"} law. Analyse the following contract thoroughly and return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:

{
  "overall_risk_score": number 0-100,
  "ai_summary": "3-4 sentence executive summary of the contract",
  "arbitration_clause_valid": boolean,
  "arbitration_clause_issues": "string describing issues or empty string",
  "arbitration_seat": "seat of arbitration or empty string",
  "arbitration_institution": "arbitral institution or empty string",
  "arbitration_improved": "complete improved arbitration clause wording or empty string",
  "governing_law_found": boolean,
  "governing_law": "jurisdiction string or empty string",
  "detected_parties": {
    "party_a_name": "full name of first party from the contract",
    "party_b_name": "full name of second party from the contract"
  },
  "clauses": [
    {
      "clause_name": "short descriptive name",
      "start_phrase": "first 8-10 words of the clause verbatim from the text",
      "risk_level": "low|medium|high|critical",
      "analysis": "what this clause does and the risk it creates",
      "redline_suggestion": "suggested revised language to improve the clause",
      "standard_alternative": "what market standard looks like for this type of clause"
    }
  ],
  "missing_clauses": [
    {
      "clause_type": "name of missing clause",
      "importance": "low|medium|high|critical",
      "consequence_of_omission": "what happens without this clause",
      "suggested_text": "complete draft text for this clause"
    }
  ],
  "obligations": {
    "party_a": ["obligation 1", "obligation 2"],
    "party_b": ["obligation 1", "obligation 2"]
  },
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "negotiation_points": [
    "specific point 1 the reviewing party should negotiate",
    "specific point 2",
    "specific point 3",
    "specific point 4",
    "specific point 5"
  ],
  "ai_insights": "Write 4-5 substantive paragraphs as a senior associate memo covering: (1) overall risk profile and key concerns with this specific contract, (2) the most critical clauses and negotiation leverage points, (3) missing protections and their commercial impact, (4) dispute resolution assessment and enforceability under applicable law, (5) practical recommendations before signing. Be specific to this contract — do not write generic advice."
}

Industry focus: Review using standards and risk factors for ${industryFocus}.
${lawsContext ? `\nApplicable legislation to reference:\n${lawsContext}` : ""}

Requirements:
- Identify at least 8-12 clauses
- Identify at least 4-6 missing clauses
- Use actual party names from the contract in the obligations section
- The ai_insights field must contain substantive paragraphs, not bullet points
- Be specific and practical in all fields

CONTRACT TEXT:
${excerpt}`,
        }],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    let analysis: Record<string, unknown> = {};
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        overall_risk_score: 50,
        ai_summary: "Analysis could not be parsed. Please try again.",
        clauses: [], missing_clauses: [],
        obligations: { party_a: [], party_b: [] },
        recommendations: [], negotiation_points: [], ai_insights: "",
        arbitration_clause_valid: false, arbitration_clause_issues: "",
        arbitration_seat: "", arbitration_institution: "", arbitration_improved: "",
        governing_law_found: false, governing_law: "",
        detected_parties: { party_a_name: "Party A", party_b_name: "Party B" },
      };
    }

    const { data: savedAnalysis } = await supabase.from("contract_analyses").insert({
      document_id: document_id || null,
      user_id,
      case_id: case_id || null,
      overall_risk_score: Number(analysis.overall_risk_score) || 0,
      risk_items: analysis.clauses ?? [],
      clauses_data: analysis.clauses ?? [],
      missing_clauses: analysis.missing_clauses ?? [],
      obligations: analysis.obligations ?? { party_a: [], party_b: [] },
      recommendations: analysis.recommendations ?? [],
      negotiation_points: analysis.negotiation_points ?? [],
      ai_insights: String(analysis.ai_insights ?? ""),
      industry_type: industry_type ?? "commercial",
      ai_summary: String(analysis.ai_summary ?? ""),
      contract_text: text.slice(0, 50000),
      arbitration_clause_valid: Boolean(analysis.arbitration_clause_valid),
      arbitration_clause_issues: String(analysis.arbitration_clause_issues ?? ""),
      governing_law_found: Boolean(analysis.governing_law_found),
      governing_law: String(analysis.governing_law ?? ""),
    }).select().maybeSingle();

    return new Response(
      JSON.stringify({ ...analysis, id: savedAnalysis?.id, contract_text: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
