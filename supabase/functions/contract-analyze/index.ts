// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchLawsAfricaSources, COUNTRY_MAP } from "../_shared/laws-africa.ts";
import { CIMA_SYSTEM_PROMPT } from "../_shared/cima-system-prompt.ts";
import { fetchTaggedAuthorityContext } from "../_shared/tagged-authorities.ts";
import { buildPlaybookGroundingBlock } from "../_shared/strict-grounding.ts";
import { requireUser } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse, HttpError } from "../_shared/http-error.ts";
import { requireString, optionalString, optionalUUID, optionalUUIDArray, optionalDocumentIdArray, requireArray } from "../_shared/validate.ts";

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

interface CaseLawRow {
  id: string;
  title: string;
  content: string;
  citation: string;
  jurisdiction?: string;
  source_type: string;
  doc_id?: string;
}

async function fetchCaseLawRows(query: string, supabase: ReturnType<typeof createClient>): Promise<CaseLawRow[]> {
  if (!query) return [];
  try {
    const { data, error } = await supabase.rpc("search_legal_library_fts", {
      search_query: query,
      match_count: 8,
    });
    if (error || !data) return [];
    return (data as CaseLawRow[]).filter((r) => r.source_type === "case").slice(0, 4);
  } catch {
    return [];
  }
}

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
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const verifiedUser = await requireUser(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await enforceRateLimit(supabase, verifiedUser.id, "contract-analyze", 10, 60);

    // Accept both document_type (new) and industry_type (legacy) params
    const body = await req.json();
    const text = requireString(body.text, "text", { maxLength: 300000 });
    const document_id = optionalUUID(body.document_id, "document_id");
    const case_id = optionalUUID(body.case_id, "case_id");
    const document_type = optionalString(body.document_type, "document_type", 50);
    const industry_type = optionalString(body.industry_type, "industry_type", 50);
    const jurisdiction = optionalString(body.jurisdiction, "jurisdiction", 100);
    const library_doc_ids = optionalUUIDArray(body.library_doc_ids, "library_doc_ids");
    const document_ids = optionalDocumentIdArray(body.document_ids, "document_ids");
    const tagged_authorities = body.tagged_authorities === undefined
      ? undefined
      : requireArray(body.tagged_authorities, "tagged_authorities", { maxItems: 20, itemValidator: (v) => v });
    const user_id = verifiedUser.id;

    // Ownership checks: document_id/case_id used to be trusted straight from
    // the request body and attached to the saved analysis with no check that
    // the caller actually owns them — reject instead of silently attributing
    // an analysis to someone else's document/case.
    if (document_id) {
      const { data: doc } = await supabase.from("documents").select("id").eq("id", document_id).eq("user_id", user_id).maybeSingle();
      if (!doc) throw new HttpError(403, "document_id does not belong to the current user");
    }
    if (case_id) {
      const { data: c } = await supabase.from("cases").select("id").eq("id", case_id).eq("user_id", user_id).maybeSingle();
      if (!c) throw new HttpError(403, "case_id does not belong to the current user");
    }

    const effectiveDocType = document_type ?? industry_type ?? "commercial";

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";
    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";

    // Clause `char_start`/`char_end` must be offsets into the exact text the
    // AI is shown, so this has to stay a single contiguous prefix (unlike
    // embed-document's summary, which can safely sample non-contiguous
    // windows) — raising the cap is the only way to cover more of a long
    // document without breaking clause-position highlighting. 180K chars
    // (~45K tokens) leaves headroom under deepseek-chat's context window for
    // the system prompt, laws/case-law context, and the 8192-token response,
    // while covering contracts far longer than the previous 100K-char cap
    // silently allowed through.
    const MAX_ANALYSIS_CHARS = 180000;
    const excerpt = text.slice(0, MAX_ANALYSIS_CHARS);
    const docFocus = DOCUMENT_TYPE_FOCUS[effectiveDocType] ?? DOCUMENT_TYPE_FOCUS.general;

    const countryCode = COUNTRY_MAP[(jurisdiction ?? "ghana").toLowerCase()] ?? "gh";
    const lawsQuery = `document review ${effectiveDocType} law ${jurisdiction ?? "ghana"}`;
    const [lawsSources, caseLawRows] = await Promise.all([
      fetchLawsAfricaSources(lawsQuery, lawsAfricaKey, countryCode),
      fetchCaseLawRows(`${effectiveDocType} contract dispute case law ${jurisdiction ?? "ghana"}`, supabase),
    ]);

    const lawsContext = lawsSources.length > 0
      ? `\nApplicable legislation to reference:\n${lawsSources
          .map((s, i) => `[L${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}\n${s.content}`)
          .join("\n\n")}`
      : "";
    const caseLawContext = caseLawRows.length > 0
      ? `\nRelevant Ghanaian case law:\n${caseLawRows
          .map((r, i) => `[C${i + 1}] ${r.citation ?? r.title}\n${(r.content ?? "").slice(0, 800)}`)
          .join("\n\n")}`
      : "";

    // Playbook/authority tagging: augments the review (doesn't replace it —
    // the document itself remains the primary subject of analysis).
    const taggedContext = ((library_doc_ids?.length ?? 0) > 0 || (document_ids?.length ?? 0) > 0)
      ? await fetchTaggedAuthorityContext(supabase, user_id, library_doc_ids, document_ids, excerpt.slice(0, 3000), hfKey)
      : null;
    const playbookBlock = taggedContext ? buildPlaybookGroundingBlock(taggedContext.titles, taggedContext.context) : "";

    const citedSources: CitedSource[] = [
      ...lawsSources.map((s, i) => ({
        marker: `L${i + 1}`,
        source_name: s.source_name,
        citation: s.citation,
        source_type: s.source_type,
        jurisdiction: s.jurisdiction,
        content: s.content,
        url: s.url,
      })),
      ...caseLawRows.map((r, i) => ({
        marker: `C${i + 1}`,
        source_name: r.title,
        citation: r.citation,
        source_type: "case",
        jurisdiction: r.jurisdiction,
        content: r.content,
        doc_id: r.doc_id,
      })),
      ...(taggedContext?.citedSources ?? []),
    ];

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: CIMA_SYSTEM_PROMPT +
              `\n\nDETECTED JURISDICTION: ${jurisdiction ?? "Ghana"}` +
              `\n\n===CRITICAL OVERRIDE — THIS TASK ONLY===\nThe RESPONSE FORMAT section above does NOT apply here. Do not follow the 7-step response format. Your entire response must be a single valid JSON object and nothing else. No prose, no markdown, no code fences, no text before or after the JSON. Failure to return pure JSON will break the application.` +
              playbookBlock,
          },
          {
          role: "user",
          content: `Conduct a comprehensive document review and return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:

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
      "full_clause_text": "the complete text of the clause/provision as it appears in the document (include the entire provision from start to end)",
      "char_start": "the exact character position (0-indexed) where this clause begins in the original document text",
      "char_end": "the exact character position (0-indexed) where this clause ends in the original document text",
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
${lawsContext}
${caseLawContext}

Requirements:
- Identify at least 8-12 provisions (clauses), covering all 6 defect categories where present
- Specifically flag: (1) all ambiguous terms, (2) any provision that may be unenforceable, (3) jurisdictional defects, (4) missing key obligations, (5) excessive liability exposure, (6) arbitration clause issues
- Identify at least 4-6 missing provisions
- Use actual party names from the document in the obligations section
- The ai_insights field must contain substantive paragraphs, not bullet points
- Be specific and practical in all fields — refer to actual text from the document
- When a specific piece of legislation, Ghanaian case law, or a tagged playbook/authority source above is genuinely relevant to a point in "ai_summary", a clause's "analysis", "ai_insights", or "recommendations", cite it inline using its exact bracket marker (e.g. "[L1]", "[C1]", "[T1]"). Only cite where truly relevant — do not force citations where none apply.

DOCUMENT TEXT:
${excerpt}`,
          }
        ],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (!res.ok) throw new Error(`AI service error: ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    let analysis: Record<string, unknown> = {};
    try {
      // Strip markdown fences first
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Try direct parse, fall back to extracting the first {...} block
      try {
        analysis = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) analysis = JSON.parse(match[0]);
        else throw new Error("No JSON object found in response");
      }
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
      arbitration_seat: String(analysis.arbitration_seat ?? ""),
      arbitration_institution: String(analysis.arbitration_institution ?? ""),
      arbitration_improved: String(analysis.arbitration_improved ?? ""),
      detected_parties: analysis.detected_parties ?? null,
      detected_document_type: String(analysis.detected_document_type ?? ""),
      governing_law_found: Boolean(analysis.governing_law_found),
      governing_law: String(analysis.governing_law ?? ""),
      cited_sources: citedSources,
      tagged_authorities: tagged_authorities ?? [],
    }).select().maybeSingle();

    return new Response(
      JSON.stringify({ ...analysis, id: savedAnalysis?.id, contract_text: text, cited_sources: citedSources }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return errorResponse(error, cors);
  }
});
