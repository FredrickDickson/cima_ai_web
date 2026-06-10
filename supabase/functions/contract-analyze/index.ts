// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchLawsAfricaContext, COUNTRY_MAP } from "../_shared/laws-africa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Document-type-specific review focus
// ---------------------------------------------------------------------------
const DOCUMENT_TYPE_FOCUS: Record<string, string> = {
  commercial: "standard commercial contract risks including payment terms, liability caps, indemnities, force majeure, and termination rights",
  construction: "construction-specific risks including delay provisions, variation clauses, payment certification, defects liability, performance bonds, and dispute boards",
  employment: "employment law compliance including termination rights, restrictive covenants, transfer protections, discrimination provisions, and statutory entitlements",
  technology: "technology contract risks including IP ownership, data protection compliance, SLA provisions, source code escrow, and liability for software defects",
  "joint venture": "JV-specific risks including deadlock mechanisms, exit provisions, tag-along/drag-along rights, reserved matters, and management structure",
  shareholder: "shareholder agreement risks including pre-emption rights, minority protections, dividend policies, anti-dilution provisions, and drag-along mechanics",
  real_estate: "real estate risks including title clarity, encumbrances, planning conditions, vacant possession, and completion mechanics",
  finance: "finance agreement risks including events of default, acceleration rights, security enforcement, financial covenants, and MAC clauses",
  arbitration_agreement: "arbitration agreement validity, scope of arbitrable disputes, seat selection, institutional rules compliance, and enforceability under the New York Convention",
  court_award: "award completeness, finality, enforceability under the New York Convention, grounds for challenge, and cross-border recognition issues",
  settlement: "settlement agreement enforceability, adequacy of consideration, scope of release, confidentiality obligations, and breach remedies",
  mou: "MOU/LOI enforceability, which provisions are binding vs non-binding, implied obligations, and risk of unintended contract formation",
  general: "all standard legal risk categories including ambiguity, enforceability, jurisdictional defects, missing obligations, liability exposure, and dispute resolution gaps",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Accept both document_type (new) and industry_type (legacy) params
    const { text, document_id, case_id, user_id, document_type, industry_type, jurisdiction } = await req.json();
    if (!text || !user_id) throw new Error("text and user_id are required");

    const effectiveDocType = document_type ?? industry_type ?? "commercial";

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const excerpt = text.slice(0, 100000);
    const docFocus = DOCUMENT_TYPE_FOCUS[effectiveDocType] ?? DOCUMENT_TYPE_FOCUS.general;

    const countryCode = COUNTRY_MAP[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh";
    const lawsQuery = `document review ${effectiveDocType} law ${jurisdiction ?? "ghana"}`;
    const lawsContext = await fetchLawsAfricaContext(lawsQuery, lawsAfricaKey, countryCode);

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{
          role: "user",
          content: `You are a senior legal reviewer specialising in ${jurisdiction ?? "Ghanaian"} law. Conduct a comprehensive document review and return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:

{
  "overall_risk_score": number 0-100,
  "detected_document_type": "auto-detected document type (e.g. Commercial Contract, Settlement Agreement, Court Award, MOU, Employment Agreement, etc.)",
  "ai_summary": "3-4 sentence executive summary of the document and its key legal character",
  "arbitration_clause_valid": boolean,
  "arbitration_clause_issues": "string describing issues or empty string",
  "arbitration_seat": "seat of arbitration or empty string",
  "arbitration_institution": "arbitral institution or empty string",
  "arbitration_improved": "complete improved arbitration/dispute resolution clause wording or empty string",
  "governing_law_found": boolean,
  "governing_law": "jurisdiction string or empty string",
  "detected_parties": {
    "party_a_name": "full name of first party from the document",
    "party_b_name": "full name of second party from the document"
  },
  "clauses": [
    {
      "clause_name": "short descriptive name",
      "start_phrase": "first 8-10 words of the provision verbatim from the text",
      "risk_level": "low|medium|high|critical",
      "defect_type": "ambiguity|unenforceable|jurisdictional|missing_obligation|liability|arbitration|risk",
      "analysis": "what this provision does, the defect or risk it creates, and why it matters legally",
      "redline_suggestion": "complete revised language that fixes the defect or reduces risk",
      "standard_alternative": "what market standard or best practice looks like for this type of provision"
    }
  ],
  "missing_clauses": [
    {
      "clause_type": "name of missing provision",
      "importance": "low|medium|high|critical",
      "consequence_of_omission": "what legal or commercial risk arises without this provision",
      "suggested_text": "complete draft text for this provision"
    }
  ],
  "obligations": {
    "party_a": ["obligation 1", "obligation 2"],
    "party_b": ["obligation 1", "obligation 2"]
  },
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "negotiation_points": [
    "specific point 1 the reviewing party should negotiate or address",
    "specific point 2",
    "specific point 3",
    "specific point 4",
    "specific point 5"
  ],
  "ai_insights": "Write 4-5 substantive paragraphs as a senior associate review memo covering: (1) overall risk profile and key legal concerns with this specific document, (2) the most critical defects — ambiguities, unenforceable provisions, and jurisdictional gaps — and their legal consequences, (3) missing protections and their commercial impact, (4) dispute resolution assessment and enforceability under applicable law, (5) practical recommendations before signing or relying on this document. Be specific to this document — do not write generic advice."
}

DEFECT TYPES — classify each clause/provision under one of these:
- "ambiguity": vague, undefined terms, or language that could be interpreted in multiple ways
- "unenforceable": provisions that are void, contrary to statute, against public policy, or unlikely to be upheld by a court or tribunal
- "jurisdictional": defects relating to choice of law, seat of arbitration, jurisdiction clauses, or cross-border enforceability
- "missing_obligation": a party's obligation that is implied but not expressly stated, creating enforcement risk
- "liability": excessive, uncapped, or one-sided liability exposure; indemnities that are broader than justified
- "arbitration": invalid, pathological, or incomplete arbitration/dispute resolution clauses
- "risk": general commercial or legal risk not covered by the above categories

Document focus: Review using standards and risk factors specific to ${docFocus}.
${lawsContext ? `\nApplicable legislation to reference:\n${lawsContext}` : ""}

Requirements:
- Identify at least 8-12 provisions (clauses), covering all 6 defect categories where present
- Specifically flag: (1) all ambiguous terms, (2) any provision that may be unenforceable, (3) jurisdictional defects, (4) missing key obligations, (5) excessive liability exposure, (6) arbitration clause issues
- Identify at least 4-6 missing provisions
- Use actual party names from the document in the obligations section
- The ai_insights field must contain substantive paragraphs, not bullet points
- Be specific and practical in all fields — refer to actual text from the document

DOCUMENT TEXT:
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
        detected_document_type: "Document",
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
      industry_type: effectiveDocType,
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
