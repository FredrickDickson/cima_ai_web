import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const lawsAfricaCountryMap: Record<string, string> = {
  ghana: "gh", kenya: "ke", "south africa": "za", nigeria: "ng",
  uganda: "ug", tanzania: "tz", zambia: "zm", zimbabwe: "zw",
  malawi: "mw", namibia: "na", botswana: "bw", rwanda: "rw",
  mauritius: "mu", eswatini: "sz", lesotho: "ls", mozambique: "mz",
};

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
    const entries = results.map((item: { title?: string; citation?: string; snippet?: string; content?: string }, i: number) => {
      const title = item.title ?? "Untitled";
      const citation = item.citation ?? "";
      const snippet = item.snippet ?? item.content ?? "";
      return `[${i + 1}] ${title}${citation ? ` (${citation})` : ""}\n${snippet}`;
    });
    return `\n\nRelevant Laws.Africa Legal Sources:\n${entries.join("\n\n")}`;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Matter context: fetch case details, issues, and evidence for context-aware drafting
// ---------------------------------------------------------------------------
interface MatterParty {
  name: string;
  role: string;
  counsel?: string;
}

async function fetchMatterContext(
  supabase: ReturnType<typeof createClient>,
  caseId: string,
): Promise<string> {
  try {
    const [caseRes, issuesRes, evidenceRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", caseId).maybeSingle(),
      supabase.from("issues").select("*").eq("case_id", caseId).order("issue_number"),
      supabase.from("evidence").select("title, type, summary").eq("case_id", caseId).limit(10),
    ]);

    const c = caseRes.data;
    if (!c) return "";

    const lines: string[] = [];
    lines.push(`Matter: ${c.title}${c.matter_number ? ` (${c.matter_number})` : ""}`);
    lines.push(`Type: ${c.type} | Framework: ${c.framework || "N/A"} | Status: ${c.status}`);
    if (c.description) lines.push(`Description: ${c.description}`);

    const parties: MatterParty[] = c.parties ?? [];
    if (parties.length > 0) {
      lines.push("");
      lines.push("Parties:");
      for (const p of parties) {
        lines.push(`- ${p.role}: ${p.name}${p.counsel ? ` (Counsel: ${p.counsel})` : ""}`);
      }
    }

    const issues = issuesRes.data ?? [];
    if (issues.length > 0) {
      lines.push("");
      lines.push("Key Issues:");
      for (const issue of issues) {
        let line = `- ${issue.description}`;
        if (issue.claimant_position) line += ` — Claimant: ${issue.claimant_position}`;
        if (issue.respondent_position) line += ` / Respondent: ${issue.respondent_position}`;
        lines.push(line);
      }
    }

    const evidence = evidenceRes.data ?? [];
    if (evidence.length > 0) {
      lines.push("");
      lines.push("Evidence on file:");
      for (const e of evidence) {
        lines.push(`- ${e.title} (${e.type})${e.summary ? `: ${e.summary}` : ""}`);
      }
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, template_type, jurisdiction, variables, custom_instructions, case_id, user_id, template_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;
    const lawsAfricaKey = Deno.env.get("LAWS_AFRICA_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ---- Fetch matter context if a case is linked ----
    const matterContext = case_id ? await fetchMatterContext(supabase, case_id) : "";

    let templateContent = "";
    let templateTitle = template_type ?? "Legal Document";

    if (template_id) {
      const { data: tmpl } = await supabase.from("templates").select("*").eq("id", template_id).maybeSingle();
      if (tmpl) {
        templateTitle = tmpl.title;
        templateContent = tmpl.content;
        if (variables && typeof variables === "object") {
          for (const [key, value] of Object.entries(variables)) {
            templateContent = templateContent.replaceAll(`{{${key}}}`, String(value ?? ""));
          }
        }
      }
    }

    const variableList = variables && typeof variables === "object"
      ? Object.entries(variables).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "";

    // Fetch relevant legislation from Laws.Africa to ground the draft
    const searchQuery = prompt
      ? `${prompt} ${jurisdiction ?? "Ghana"} law`
      : `${templateTitle} ${jurisdiction ?? "Ghana"} law`;
    const lawsContext = await fetchLawsAfricaContext(searchQuery, lawsAfricaKey, jurisdiction);

    // ---- Build the AI prompt based on input path ----
    let aiPrompt: string;

    if (template_id && templateContent) {
      // Path 1: Template-based drafting (existing)
      aiPrompt = `You are an expert legal drafter specialising in ${jurisdiction ?? "Ghanaian"} law and international commercial arbitration.

Complete and enhance the following legal document template to create a polished, professional, and legally sound document. Fill in any remaining placeholders and ensure all provisions are complete and enforceable.

Template (partially filled):
${templateContent}

${variableList ? `Variable values provided:\n${variableList}\n` : ""}
${matterContext ? `Use the following matter details to populate the document with accurate party names, dates, and case specifics:\n\n${matterContext}\n` : ""}
${custom_instructions ? `Special instructions: ${custom_instructions}\n` : ""}
${lawsContext ? `Use the following legal sources to ensure the draft complies with applicable legislation:\n${lawsContext}\n` : ""}
Produce the complete final document in professional legal format.

After the main document, add the following three sections exactly as labelled:

---SHORT FORM---
A condensed version of the document (maximum 30% of the main document length) preserving the core obligations, key dates, payment terms, and enforcement provisions. Suitable for quick reference.

---PLAIN ENGLISH---
A plain-language explanation of this document written for a non-lawyer. Explain: what this document does, what each party has agreed to, what happens if someone breaks the agreement, and the 3 most important things to know. Use simple sentences. No legal jargon.

---LEGAL NOTES---
3-5 key legal observations for the parties, citing any relevant legislation from the sources above.`;

    } else if (prompt) {
      // Path 2: Natural language drafting
      templateTitle = prompt.length > 80 ? prompt.slice(0, 77) + "..." : prompt;

      // Extract the document type from the user's prompt to enforce it in the AI instruction
      const docTypeMatch = prompt.match(/^draft\s+(?:a\s+|an\s+)?(.+?)\s+(?:for|between|regarding|concerning|in|under|about)/i);
      const requestedDocType = docTypeMatch ? docTypeMatch[1].trim() : prompt.slice(0, 60);

      aiPrompt = `You are an expert legal drafter specialising in ${jurisdiction ?? "Ghanaian"} law and international commercial arbitration.

The user has requested the following document:
"${prompt}"

CRITICAL INSTRUCTIONS — READ CAREFULLY:
1. The document type is: "${requestedDocType}". Draft EXACTLY this document type. Do NOT substitute a different document type (e.g. do not draft an Arbitration Agreement when a Notice of Arbitration is requested, do not draft a contract when a letter is requested).
2. ALL specific details mentioned in the user's request MUST appear in the document. This includes: party names, contract types, dispute descriptions, amounts, dates, and any other specifics. Do NOT replace named parties or facts with generic placeholders — use them verbatim.
3. Only use placeholders (e.g. [ADDRESS], [DATE], [AMOUNT]) for details that were not provided by the user and cannot reasonably be inferred.

${matterContext ? `Use the following linked matter details for additional party names, dates, and case specifics:\n\n${matterContext}\n` : ""}
${lawsContext ? `Use the following legal sources to ensure the draft complies with applicable legislation:\n${lawsContext}\n` : ""}
${custom_instructions ? `Additional instructions: ${custom_instructions}\n` : ""}
Jurisdiction: ${jurisdiction ?? "Ghana"}

Produce a complete, professionally formatted legal document in markdown. Include:
- A document title that matches exactly what was requested
- All standard clauses and provisions specific to this document type
- Numbered clauses and sub-clauses where applicable
- The exact party names and facts from the user's request (not generic placeholders)
- Signature blocks
- Professional legal language and structure appropriate for ${jurisdiction ?? "Ghana"}

After the main document, add the following three sections exactly as labelled:

---SHORT FORM---
A condensed version of the document (maximum 30% of the main document length) preserving the core obligations, key dates, payment terms, and enforcement provisions. Suitable for quick reference.

---PLAIN ENGLISH---
A plain-language explanation of this document written for a non-lawyer. Explain: what this document does, what each party has agreed to, what happens if someone breaks the agreement, and the 3 most important things to know. Use simple sentences. No legal jargon.

---LEGAL NOTES---
3-5 key legal observations, citing any relevant legislation from the sources above.`;

    } else {
      // Path 3: Freeform (existing fallback)
      aiPrompt = `You are an expert legal drafter specialising in ${jurisdiction ?? "Ghanaian"} law and international commercial arbitration.

Draft a complete, professional ${templateTitle} for the following:

${variableList ? `Details:\n${variableList}\n` : ""}
Jurisdiction: ${jurisdiction ?? "Ghana"}
${matterContext ? `Matter context:\n${matterContext}\n` : ""}
${custom_instructions ? `Special instructions: ${custom_instructions}\n` : ""}
${lawsContext ? `Use the following legal sources to ensure the draft complies with applicable legislation:\n${lawsContext}\n` : ""}
Produce a complete document with all standard provisions, properly structured and formatted.

After the main document, add the following three sections exactly as labelled:

---SHORT FORM---
A condensed version of the document (maximum 30% of the main document length) preserving core obligations, key dates, and enforcement provisions. Suitable for quick reference.

---PLAIN ENGLISH---
A plain-language explanation written for a non-lawyer. Cover: what this document does, what each party agreed to, what happens if someone breaks the agreement, and the 3 most important things to know.

---LEGAL NOTES---
3-5 key legal observations, citing any relevant legislation from the sources above.`;
    }

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: aiPrompt }],
        temperature: 0.2,
        max_tokens: 8192,
      }),
    });

    if (!res.ok) throw new Error(`AI service error: ${res.status}`);
    const data = await res.json();
    const fullContent = data.choices?.[0]?.message?.content ?? "";

    // Parse the structured output: main doc | short form | plain english | legal notes
    const shortFormMatch = fullContent.match(/---SHORT FORM---\s*\n([\s\S]+?)(?=---PLAIN ENGLISH---|---LEGAL NOTES---|$)/i);
    const plainEnglishMatch = fullContent.match(/---PLAIN ENGLISH---\s*\n([\s\S]+?)(?=---SHORT FORM---|---LEGAL NOTES---|$)/i);
    const legalNotesMatch = fullContent.match(/---LEGAL NOTES---\s*\n([\s\S]+?)(?=---SHORT FORM---|---PLAIN ENGLISH---|$)/i);

    const shortForm = shortFormMatch ? shortFormMatch[1].trim() : "";
    const plainEnglish = plainEnglishMatch ? plainEnglishMatch[1].trim() : "";
    const legalNotes = legalNotesMatch ? legalNotesMatch[1].trim() : "";

    // Main content is everything before the first separator
    const firstSepIdx = fullContent.search(/---SHORT FORM---|---PLAIN ENGLISH---|---LEGAL NOTES---/i);
    const mainContent = (firstSepIdx > 0 ? fullContent.slice(0, firstSepIdx) : fullContent).trim();

    const wordCount = mainContent.split(/\s+/).filter(Boolean).length;

    const { data: draft } = await supabase.from("drafts").insert({
      user_id,
      case_id: case_id || null,
      title: templateTitle,
      template_type: prompt ? "natural_language" : (template_type ?? "custom"),
      content: mainContent,
      jurisdiction: jurisdiction ?? "ghana",
      status: "draft",
    }).select().maybeSingle();

    return new Response(
      JSON.stringify({
        draft_id: draft?.id,
        content: mainContent,
        full_content: fullContent,
        legal_notes: legalNotes,
        short_form: shortForm,
        plain_english: plainEnglish,
        word_count: wordCount,
        template_title: templateTitle,
        jurisdiction: jurisdiction ?? "ghana",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
