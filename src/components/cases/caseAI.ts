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
  return data.choices?.[0]?.message?.content ?? "No response received.";
}
