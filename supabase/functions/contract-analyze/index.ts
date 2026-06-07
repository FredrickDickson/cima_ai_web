import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, document_id, case_id, user_id } = await req.json();
    if (!text || !user_id) throw new Error("text and user_id are required");

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const excerpt = text.slice(0, 12000);

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{
          role: "user",
          content: `You are an expert contract review lawyer. Analyse the following contract and return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:

{
  "overall_risk_score": number 0-100,
  "ai_summary": "3-4 sentence executive summary of the contract",
  "arbitration_clause_valid": boolean,
  "arbitration_clause_issues": "string describing issues or empty string",
  "governing_law_found": boolean,
  "governing_law": "jurisdiction string or empty string",
  "clauses": [
    {
      "clause_name": "short name",
      "start_phrase": "first 8-10 words of the clause verbatim from the text",
      "risk_level": "low|medium|high|critical",
      "analysis": "what this clause does and the risk it creates",
      "redline_suggestion": "suggested revised language",
      "standard_alternative": "what market standard looks like"
    }
  ],
  "missing_clauses": [
    {
      "clause_type": "name of missing clause",
      "importance": "low|medium|high|critical",
      "consequence_of_omission": "what happens without this clause",
      "suggested_text": "draft text for this clause"
    }
  ],
  "obligations": {
    "party_a": ["obligation 1", "obligation 2"],
    "party_b": ["obligation 1", "obligation 2"]
  },
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Identify at least 5-8 clauses and 3-5 missing clauses. Be thorough.

CONTRACT TEXT:
${excerpt}`,
        }],
        temperature: 0.1,
        max_tokens: 4096,
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
        clauses: [],
        missing_clauses: [],
        obligations: { party_a: [], party_b: [] },
        recommendations: [],
        arbitration_clause_valid: false,
        arbitration_clause_issues: "",
        governing_law_found: false,
        governing_law: "",
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
