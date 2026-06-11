import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Loader2, Gavel, AlertCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import type { CaseContext } from "./caseAI";

type Step = 0 | 1 | 2 | 3;

interface Issue {
  id: string;
  issue_number: number;
  description: string;
  claimant_position?: string;
  respondent_position?: string;
  status: string;
}

const AWARD_TYPES = [
  { value: "Final Award", desc: "A definitive award resolving all issues and granting final relief." },
  { value: "Interim Award", desc: "A partial or provisional award on specific issues before the final award." },
  { value: "Consent Award", desc: "An award recording a settlement reached by the parties." },
  { value: "Cost Award", desc: "An award dealing solely with the allocation of arbitration costs." },
];

const STEPS = ["Award Type", "Procedural History", "Issues & Findings", "Relief & Orders"];

export default function AwardWizard({ caseData, onClose }: { caseData: CaseContext; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const [awardType, setAwardType] = useState("Final Award");

  // Step 1 — procedural history
  const [proceduralHistory, setProceduralHistory] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Step 2 — issues & findings
  const [issues, setIssues] = useState<Issue[]>([]);
  const [findings, setFindings] = useState<Record<string, string>>({});
  const [loadingIssues, setLoadingIssues] = useState(true);

  // Step 3 — relief & costs
  const [reliefAwarded, setReliefAwarded] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestFrom, setInterestFrom] = useState("");
  const [costAllocation, setCostAllocation] = useState("Each party shall bear its own costs of the arbitration.");
  const [finalOrders, setFinalOrders] = useState("");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Fetch procedural history from hearings + orders
  useEffect(() => {
    Promise.all([
      supabase.from("hearings")
        .select("title, scheduled_at, type, location, status, notes")
        .eq("case_id", caseData.id)
        .order("scheduled_at"),
      supabase.from("orders")
        .select("title, order_date, content")
        .eq("case_id", caseData.id)
        .order("order_date"),
    ]).then(([{ data: hearings }, { data: orders }]) => {
      const lines: string[] = [];
      const h = hearings ?? [];
      const o = orders ?? [];

      if (h.length > 0) {
        lines.push("Hearings:");
        for (const hr of h) {
          const d = hr.scheduled_at ? new Date(hr.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "[date]";
          lines.push(`- ${d}: ${hr.title}${hr.location ? ` at ${hr.location}` : ""}${hr.status ? ` (${hr.status})` : ""}${hr.notes ? `. ${hr.notes}` : ""}`);
        }
      }
      if (o.length > 0) {
        if (lines.length) lines.push("");
        lines.push("Procedural Orders:");
        for (const ord of o) {
          const d = ord.order_date ? new Date(ord.order_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "[date]";
          lines.push(`- ${d}: ${ord.title}`);
        }
      }
      setProceduralHistory(lines.join("\n") || "No hearings or orders recorded. Please describe the procedural history.");
      setLoadingHistory(false);
    });
  }, [caseData.id]);

  // Fetch issues
  useEffect(() => {
    supabase.from("issues").select("*").eq("case_id", caseData.id).order("issue_number")
      .then(({ data }) => {
        setIssues(data ?? []);
        setLoadingIssues(false);
      });
  }, [caseData.id]);

  async function generate() {
    setGenerating(true);
    setError("");

    const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
    const claimant = parties.find(p => /claimant/i.test(p.role))?.name ?? "[Claimant]";
    const respondent = parties.find(p => /respondent/i.test(p.role))?.name ?? "[Respondent]";

    const issuesText = issues.length > 0
      ? issues.map(i => {
          const finding = findings[i.id] ?? "";
          return [
            `${i.issue_number}. ${i.description}`,
            i.claimant_position ? `   Claimant's position: ${i.claimant_position}` : "",
            i.respondent_position ? `   Respondent's position: ${i.respondent_position}` : "",
            `   Tribunal's finding: ${finding || "[To be drafted]"}`,
          ].filter(Boolean).join("\n");
        }).join("\n\n")
      : "Issues to be identified from the record.";

    const prompt = `Draft a complete ${awardType} in arbitration proceedings between ${claimant} (Claimant) and ${respondent} (Respondent) titled "${caseData.title}".

Structure the award using exactly these 10 sections in this order:

1. INTRODUCTION
Case reference: ${(caseData as { matter_number?: string }).matter_number ?? "[Case Reference]"}; Arbitration commenced under: ${caseData.framework ?? "Ghana ADR Act 2010 (Act 798)"}; Seat: Ghana.

2. PARTIES
${parties.map(p => `${p.role.toUpperCase()}: ${p.name}`).join("\n")}

3. PROCEDURAL HISTORY
${proceduralHistory}

4. FACTS
Summarize the material facts from the parties' submissions and evidence on record, drawing from the procedural history and issues above.

5. ISSUES FOR DETERMINATION
${issuesText}

6. APPLICABLE LAW
Primary statute: ${caseData.framework ?? "Ghana ADR Act 2010 (Act 798)"}. Cite applicable Ghanaian law, common law principles, and any relevant international arbitration standards.

7. FINDINGS AND ANALYSIS
For each issue listed above, provide a detailed legal analysis applying the applicable law to the facts. Address each party's arguments. State the Tribunal's conclusion on each issue.

8. RELIEFS GRANTED
${reliefAwarded || "[State all monetary and non-monetary reliefs awarded, with specific amounts and dates]"}

9. INTEREST AND COSTS
Interest: ${interestRate ? `${interestRate}% per annum from ${interestFrom || "[date]"} until payment` : "[To be specified]"}.
Costs: ${costAllocation}

10. FINAL ORDERS
${finalOrders || "[State all final orders including payment obligations, timelines, and any injunctive relief]"}

DRAFTING INSTRUCTIONS:
- Use formal arbitral award language throughout
- Number all paragraphs sequentially within each section
- Ensure neutrality and procedural fairness
- Include a signature block for the arbitrator(s) at the end
- The award must be enforceable under Ghanaian law and the New York Convention`;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          prompt,
          case_id: caseData.id,
          user_id: user!.id,
          jurisdiction: "ghana",
          template_type: "arbitral_award",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onClose();
      navigate(`/drafting?draft_id=${data.draft_id}&case_id=${caseData.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setGenerating(false);
    }
  }

  const canProceed = step === 0 || (step === 1 && !loadingHistory) || (step === 2 && !loadingIssues) || step === 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center">
              <Gavel size={16} className="text-gold-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Award Drafting Wizard</h2>
              <p className="text-xs text-slate-500">{caseData.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-navy-800 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-0 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? "bg-emerald-500 text-white" : i === step ? "bg-gold-500 text-navy-950" : "bg-navy-700 text-slate-500"
                }`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${i === step ? "text-white" : i < step ? "text-emerald-400" : "text-slate-500"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-700 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 0: Award Type */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-4">Select the type of arbitral award to draft.</p>
              {AWARD_TYPES.map(t => (
                <button key={t.value} onClick={() => setAwardType(t.value)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                    awardType === t.value
                      ? "border-gold-500/50 bg-gold-500/5"
                      : "border-navy-700 hover:border-navy-600 hover:bg-navy-800/30"
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors ${awardType === t.value ? "border-gold-500 bg-gold-500" : "border-slate-600"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${awardType === t.value ? "text-gold-400" : "text-white"}`}>{t.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Procedural History */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Review and edit the procedural history. This is auto-populated from your hearings and orders records.</p>
              {loadingHistory ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={14} className="animate-spin" />Loading records...</div>
              ) : (
                <textarea
                  value={proceduralHistory}
                  onChange={e => setProceduralHistory(e.target.value)}
                  rows={14}
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-gold-500/50 resize-none font-mono"
                  placeholder="Describe the procedural history of the arbitration..."
                />
              )}
            </div>
          )}

          {/* Step 2: Issues & Findings */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">For each issue, enter the Tribunal's finding. Leave blank to have the AI draft the finding from the parties' positions.</p>
              {loadingIssues ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={14} className="animate-spin" />Loading issues...</div>
              ) : issues.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-navy-700 rounded-xl">
                  <p className="text-sm text-slate-500">No issues recorded for this case.</p>
                  <p className="text-xs text-slate-600 mt-1">Add issues in the Issues tab, then return here.</p>
                  <p className="text-xs text-slate-500 mt-3">You can still generate the award — the AI will identify issues from the case context.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map(issue => (
                    <div key={issue.id} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono text-gold-500/70 shrink-0 mt-0.5">#{issue.issue_number}</span>
                        <p className="text-sm font-medium text-white">{issue.description}</p>
                      </div>
                      {(issue.claimant_position || issue.respondent_position) && (
                        <div className="grid grid-cols-2 gap-2">
                          {issue.claimant_position && (
                            <div className="bg-gold-500/5 border border-gold-500/15 rounded-lg p-2">
                              <p className="text-xs font-medium text-gold-400 mb-0.5">Claimant</p>
                              <p className="text-xs text-slate-400 line-clamp-2">{issue.claimant_position}</p>
                            </div>
                          )}
                          {issue.respondent_position && (
                            <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-2">
                              <p className="text-xs font-medium text-red-400 mb-0.5">Respondent</p>
                              <p className="text-xs text-slate-400 line-clamp-2">{issue.respondent_position}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-slate-400 block mb-1.5">Tribunal's Finding (optional — AI will draft if blank)</label>
                        <textarea
                          value={findings[issue.id] ?? ""}
                          onChange={e => setFindings(p => ({ ...p, [issue.id]: e.target.value }))}
                          rows={3}
                          placeholder="e.g. The Tribunal finds in favour of the Claimant on this issue. The Respondent failed to..."
                          className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Relief & Orders */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Specify the relief granted, interest, costs, and final orders. Fields can be left blank for the AI to complete.</p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Relief Granted</label>
                <textarea
                  value={reliefAwarded}
                  onChange={e => setReliefAwarded(e.target.value)}
                  rows={4}
                  placeholder="e.g. The Respondent shall pay the Claimant the sum of GHS 500,000 being the principal amount due under the Contract, plus damages of GHS 50,000..."
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Interest Rate (% p.a.)</label>
                  <input
                    value={interestRate}
                    onChange={e => setInterestRate(e.target.value)}
                    placeholder="e.g. 18"
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Interest Accruing From</label>
                  <input
                    type="date"
                    value={interestFrom}
                    onChange={e => setInterestFrom(e.target.value)}
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Cost Allocation</label>
                <select
                  value={costAllocation}
                  onChange={e => setCostAllocation(e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/50"
                >
                  <option>Each party shall bear its own costs of the arbitration.</option>
                  <option>The Respondent shall bear all costs of the arbitration, including the Claimant's legal costs.</option>
                  <option>The Claimant shall bear all costs of the arbitration, including the Respondent's legal costs.</option>
                  <option>Costs shall be apportioned equally between the parties.</option>
                  <option value="custom">Custom (specify in Final Orders)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Final Orders</label>
                <textarea
                  value={finalOrders}
                  onChange={e => setFinalOrders(e.target.value)}
                  rows={4}
                  placeholder="e.g. 1. The Respondent shall pay the sums awarded within 30 days of this Award. 2. In default of payment, interest shall continue to accrue..."
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-gold-500/50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  <AlertCircle size={13} />{error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-navy-800">
          <button
            onClick={() => step > 0 ? setStep((step - 1) as Step) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white border border-navy-700 hover:border-navy-600 rounded-xl transition-colors">
            <ChevronLeft size={14} />{step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed}
              className="flex items-center gap-1.5 px-5 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50">
              Next<ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2 bg-gold-500 text-navy-950 rounded-xl text-sm font-bold hover:bg-gold-400 transition-colors disabled:opacity-60">
              {generating ? <><Loader2 size={14} className="animate-spin" />Drafting Award...</> : <><Gavel size={14} />Generate Award</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
