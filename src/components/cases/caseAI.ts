import { supabase } from "../../lib/supabase";

export interface CaseContext {
  id: string;
  title: string;
  matter_number?: string;
  type: string;
  framework?: string;
  description?: string;
  parties: { name: string; role: string }[];
}

export async function callCaseAI(
  caseData: CaseContext,
  userPrompt: string,
  extraContext = ""
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
  const systemCtx = `You are a legal AI assistant specialising in ${caseData.type} law and dispute resolution.
Case: ${caseData.title}.${caseData.matter_number ? ` Matter #: ${caseData.matter_number}.` : ""}
Type: ${caseData.type}. Framework: ${caseData.framework || "N/A"}.
Parties: ${parties.map((p) => `${p.name} (${p.role})`).join(", ")}.
${caseData.description ? `Description: ${caseData.description}.` : ""}${extraContext ? `\n${extraContext}` : ""}`;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemCtx },
          { role: "user", content: userPrompt },
        ],
        context: "case_strategy",
      }),
    }
  );
  const data = await res.json();
  return data.content ?? data.choices?.[0]?.message?.content ?? "No response received.";
}

export type SuggestedDeadline = {
  title: string;
  due_date: string;
  type: string;
  notes: string;
  selected: boolean;
};

/**
 * Shared with DeadlinesTab.tsx (regenerating a calendar for an existing
 * matter) and NewCaseModal.tsx (seeding a calendar right at matter
 * creation) so the prompt/parsing logic never drifts between the two.
 */
export function buildProceduralCalendarPrompt(
  caseData: CaseContext & { status?: string },
  existingDeadlines: { due_date: string; title: string }[],
): string {
  const today = new Date().toISOString().split("T")[0];
  return `Generate a complete procedural calendar for this ${caseData.type} case governed by ${caseData.framework ?? "the Ghana ADR Act 2010 (Act 798)"}.

Today's date is ${today}. The case status is: ${caseData.status ?? "active"}.

Existing deadlines already recorded: ${existingDeadlines.length > 0 ? existingDeadlines.map(d => `${d.due_date}: ${d.title}`).join("; ") : "None"}.

Generate ONLY the missing procedural steps required under the applicable rules. For each step output EXACTLY this format (one per line, no extra text):
DEADLINE|<title>|<YYYY-MM-DD>|<type: filing/hearing/response/submission/other>|<brief notes>

Include all standard procedural steps such as: Statement of Claim/Defence deadlines, document disclosure, witness statement exchange, expert report exchange, pre-hearing conference, main hearing, post-hearing submissions, award deadline. Calculate realistic dates from today spaced appropriately under the rules.

Output ONLY the DEADLINE lines — no explanation, no headers, no other text.`;
}

export function parseProceduralCalendarLines(raw: string): SuggestedDeadline[] {
  const today = new Date().toISOString().split("T")[0];
  const lines = raw.split("\n").filter(l => l.startsWith("DEADLINE|"));
  return lines.map(line => {
    const parts = line.split("|");
    return {
      title: parts[1]?.trim() ?? "Procedural Step",
      due_date: parts[2]?.trim() ?? today,
      type: parts[3]?.trim() ?? "filing",
      notes: parts[4]?.trim() ?? "",
      selected: true,
    };
  }).filter(d => d.title && d.due_date);
}
