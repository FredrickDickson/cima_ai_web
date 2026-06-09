import { useEffect, useState } from "react";
import {
  Scale,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calculator,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { callCaseAI, type CaseContext } from "../caseAI";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Issue {
  id: string;
  case_id: string;
  issue_number: number;
  description: string;
  [key: string]: unknown;
}

interface IssuePosition {
  claimant: string;
  respondent: string;
  monetaryValue: string;
}

interface PaymentScheduleForm {
  totalAmount: string;
  instalments: string;
  firstPaymentDate: string;
  interestRate: string;
}

export default function SettlementTab({
  caseId,
  caseData,
}: {
  caseId: string;
  caseData: CaseContext;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  const [positions, setPositions] = useState<Record<string, IssuePosition>>({});

  const [batnaResult, setBatnaResult] = useState<string>("");
  const [batnaLoading, setBatnaLoading] = useState(false);
  const [batnaOpen, setBatnaOpen] = useState(true);

  const [rangeResult, setRangeResult] = useState<string>("");
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(true);

  const [briefResult, setBriefResult] = useState<string>("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);

  const [scheduleForm, setScheduleForm] = useState<PaymentScheduleForm>({
    totalAmount: "",
    instalments: "3",
    firstPaymentDate: "",
    interestRate: "",
  });
  const [scheduleResult, setScheduleResult] = useState<string>("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIssues() {
      setIssuesLoading(true);
      setIssuesError(null);
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("case_id", caseId)
        .order("issue_number");
      if (error) {
        setIssuesError(error.message);
      } else {
        setIssues(data ?? []);
        const initialPositions: Record<string, IssuePosition> = {};
        for (const issue of data ?? []) {
          initialPositions[issue.id] = {
            claimant: "",
            respondent: "",
            monetaryValue: "",
          };
        }
        setPositions(initialPositions);
      }
      setIssuesLoading(false);
    }
    fetchIssues();
  }, [caseId]);

  function buildPositionsSummary() {
    return issues
      .map((issue) => {
        const pos = positions[issue.id] ?? {
          claimant: "N/A",
          respondent: "N/A",
          monetaryValue: "",
        };
        return (
          `Issue ${issue.issue_number}: ${issue.description}\n` +
          `  Claimant Bottom Line: ${pos.claimant || "Not specified"}\n` +
          `  Respondent Bottom Line: ${pos.respondent || "Not specified"}` +
          (pos.monetaryValue ? `\n  Monetary Value: GHS ${pos.monetaryValue}` : "")
        );
      })
      .join("\n\n");
  }

  async function handleBatnaAnalysis() {
    setBatnaLoading(true);
    const summary = buildPositionsSummary();
    const prompt = `You are an expert arbitration analyst. Analyse the following issue-by-issue positions for case "${caseData.title}" and provide a comprehensive BATNA/WATNA analysis.

ISSUE POSITIONS:
${summary}

For each issue and for each party, identify:
1. BATNA (Best Alternative To a Negotiated Agreement) — what is the best realistic outcome if negotiations fail?
2. WATNA (Worst Alternative To a Negotiated Agreement) — what is the worst realistic outcome?
3. Most Likely Alternative (MLATNA) — the most probable outcome if no agreement is reached.

Then provide:
- A risk-adjusted settlement recommendation per issue
- An overall recommended settlement position
- Key leverage points for each party

Format the output clearly with headers for each issue and a summary section.`;

    try {
      const result = await callCaseAI(caseData, prompt);
      setBatnaResult(result);
      setBatnaOpen(true);
    } catch {
      setBatnaResult("Failed to generate BATNA/WATNA analysis. Please try again.");
    } finally {
      setBatnaLoading(false);
    }
  }

  async function handleSettlementRange() {
    setRangeLoading(true);
    const summary = buildPositionsSummary();
    const prompt = `You are an expert arbitration analyst. Based on the following issue positions for case "${caseData.title}", calculate a specific monetary settlement range.

ISSUE POSITIONS:
${summary}

Provide a structured settlement range analysis with the following:

**Minimum (Walk-Away Point)**
The absolute minimum each party should accept before walking away from negotiations.

**Recommended Settlement**
The most equitable and legally defensible settlement amount, with clear rationale.

**Maximum (Best-Case Scenario)**
The maximum any party could reasonably expect through arbitration.

Break down each figure by issue where monetary values are applicable. Express all amounts in GHS. Include the probability of each outcome range if the matter proceeds to full arbitration. Conclude with a Zone of Possible Agreement (ZOPA) analysis.`;

    try {
      const result = await callCaseAI(caseData, prompt);
      setRangeResult(result);
      setRangeOpen(true);
    } catch {
      setRangeResult("Failed to generate settlement range. Please try again.");
    } finally {
      setRangeLoading(false);
    }
  }

  async function handleMediationBrief() {
    setBriefLoading(true);
    const summary = buildPositionsSummary();
    const prompt = `You are a senior mediator preparing a confidential mediation preparation brief for case "${caseData.title}". Using the issue positions provided, draft a comprehensive Mediation Preparation Brief.

ISSUE POSITIONS:
${summary}

Structure the brief as follows:

## Mediation Preparation Brief — ${caseData.title}

### 1. Party Summary
Brief description of each party's background and relationship to the dispute.

### 2. Key Interests
What each party truly wants beneath their stated positions (interests vs. positions analysis).

### 3. Desired Outcomes
Each party's prioritised list of desired outcomes from most to least important.

### 4. BATNA Assessment
Each party's realistic best alternative if mediation fails.

### 5. Possible Concessions
Concessions each party could make without compromising their core interests.

### 6. Opening Position Recommendation
Strategic advice on how each party should open negotiations.

### 7. Red Lines
Non-negotiable positions that cannot be compromised.

### 8. Recommended Mediation Strategy
Overall approach and sequencing for the mediation session.`;

    try {
      const result = await callCaseAI(caseData, prompt);
      setBriefResult(result);
      setBriefOpen(true);
    } catch {
      setBriefResult("Failed to generate mediation brief. Please try again.");
    } finally {
      setBriefLoading(false);
    }
  }

  async function handleGenerateSchedule() {
    if (!scheduleForm.totalAmount || !scheduleForm.firstPaymentDate) return;
    setScheduleLoading(true);
    const prompt = `Generate a payment schedule for a settlement agreement in case "${caseData.title}".

Payment Details:
- Total Settlement Amount: GHS ${scheduleForm.totalAmount}
- Number of Instalments: ${scheduleForm.instalments}
- First Payment Due: ${scheduleForm.firstPaymentDate}
${scheduleForm.interestRate ? `- Interest Rate on Default: ${scheduleForm.interestRate}% per annum` : ""}

Produce a payment schedule formatted as a markdown table with these exact columns:
| Instalment No. | Due Date | Amount (GHS) | Running Balance (GHS) |

Calculate equal instalments (round to 2 decimal places, adjust the final instalment for any rounding difference). Space instalments monthly unless only 1 instalment.

${scheduleForm.interestRate ? `Include a note below the table explaining the default interest calculation method.` : ""}

After the table, include a brief "Payment Terms" section in plain prose suitable for inclusion in a legal agreement.`;

    try {
      const result = await callCaseAI(caseData, prompt);
      setScheduleResult(result);
    } catch {
      setScheduleResult("Failed to generate payment schedule. Please try again.");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleGenerateWithAI() {
    if (!user) return;
    setDraftLoading(true);
    setDraftError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const positionsSummary = buildPositionsSummary();
      const scheduleInfo =
        scheduleResult
          ? `\n\nPAYMENT SCHEDULE:\n${scheduleResult}`
          : scheduleForm.totalAmount
          ? `\n\nTotal Settlement Amount: GHS ${scheduleForm.totalAmount}, payable in ${scheduleForm.instalments} instalment(s) starting ${scheduleForm.firstPaymentDate || "TBD"}.`
          : "";

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          prompt: `Draft a comprehensive settlement agreement between the parties to resolve all issues in dispute in ${caseData.title}. The agreement should address each issue individually and incorporate the agreed positions and payment terms.\n\nISSUE POSITIONS:\n${positionsSummary}${scheduleInfo}`,
          case_id: caseId,
          user_id: user.id,
          jurisdiction: "ghana",
          template_type: "settlement_agreement",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as { draft_id?: string };
      if (data.draft_id) {
        navigate(`/drafting?draft_id=${data.draft_id}&case_id=${caseId}`);
      } else {
        navigate(`/drafting?case_id=${caseId}`);
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Failed to generate draft. Please try again.");
    } finally {
      setDraftLoading(false);
    }
  }

  function updatePosition(
    issueId: string,
    field: keyof IssuePosition,
    value: string
  ) {
    setPositions((prev) => ({
      ...prev,
      [issueId]: {
        ...(prev[issueId] ?? { claimant: "", respondent: "", monetaryValue: "" }),
        [field]: value,
      },
    }));
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Issue-by-Issue Positions */}
      <section className="rounded-xl border border-navy-700 bg-navy-800/50 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-navy-700">
          <Scale className="h-5 w-5 text-gold-400 shrink-0" />
          <h2 className="text-base font-semibold text-white">
            Issue-by-Issue Positions
          </h2>
        </div>

        <div className="p-6">
          {issuesLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading issues…</span>
            </div>
          ) : issuesError ? (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{issuesError}</span>
            </div>
          ) : issues.length === 0 ? (
            <p className="text-sm text-slate-500">
              No issues have been recorded for this case yet. Add issues in the
              Issues tab to enable settlement analysis.
            </p>
          ) : (
            <div className="space-y-6">
              {issues.map((issue) => {
                const pos = positions[issue.id] ?? {
                  claimant: "",
                  respondent: "",
                  monetaryValue: "",
                };
                return (
                  <div
                    key={issue.id}
                    className="rounded-lg border border-navy-700 bg-navy-900/40 p-5 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-xs font-bold text-gold-400">
                        {issue.issue_number}
                      </span>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {issue.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pl-9">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                          Claimant's Bottom Line
                        </label>
                        <input
                          type="text"
                          value={pos.claimant}
                          onChange={(e) =>
                            updatePosition(issue.id, "claimant", e.target.value)
                          }
                          placeholder="e.g. Full repayment of GHS 50,000"
                          className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                          Respondent's Bottom Line
                        </label>
                        <input
                          type="text"
                          value={pos.respondent}
                          onChange={(e) =>
                            updatePosition(
                              issue.id,
                              "respondent",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Willing to pay GHS 20,000"
                          className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                          Monetary Value (GHS) — optional
                        </label>
                        <input
                          type="number"
                          value={pos.monetaryValue}
                          onChange={(e) =>
                            updatePosition(
                              issue.id,
                              "monetaryValue",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: AI Analysis Buttons */}
      {issues.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <h2 className="text-base font-semibold text-white">AI Analysis</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={handleBatnaAnalysis}
              disabled={batnaLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-navy-600 bg-navy-800/60 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batnaLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              BATNA / WATNA Analysis
            </button>

            <button
              onClick={handleSettlementRange}
              disabled={rangeLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-navy-600 bg-navy-800/60 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rangeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Settlement Range
            </button>

            <button
              onClick={handleMediationBrief}
              disabled={briefLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-navy-600 bg-navy-800/60 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-gold-500/40 hover:text-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {briefLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Mediation Brief
            </button>
          </div>

          {/* BATNA Result */}
          {batnaResult && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
              <button
                onClick={() => setBatnaOpen((o) => !o)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">
                    BATNA / WATNA Analysis
                  </span>
                </div>
                {batnaOpen ? (
                  <ChevronUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-emerald-400" />
                )}
              </button>
              {batnaOpen && (
                <div className="border-t border-emerald-500/20 px-5 py-4">
                  <div className="prose prose-sm prose-invert max-w-none text-slate-300 [&_h2]:text-emerald-300 [&_h3]:text-emerald-200 [&_strong]:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {batnaResult}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settlement Range Result */}
          {rangeResult && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
              <button
                onClick={() => setRangeOpen((o) => !o)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">
                    Settlement Range Analysis
                  </span>
                </div>
                {rangeOpen ? (
                  <ChevronUp className="h-4 w-4 text-blue-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-400" />
                )}
              </button>
              {rangeOpen && (
                <div className="border-t border-blue-500/20 px-5 py-4">
                  <div className="prose prose-sm prose-invert max-w-none text-slate-300 [&_h2]:text-blue-300 [&_h3]:text-blue-200 [&_strong]:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {rangeResult}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mediation Brief Result */}
          {briefResult && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
              <button
                onClick={() => setBriefOpen((o) => !o)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">
                    Mediation Preparation Brief
                  </span>
                </div>
                {briefOpen ? (
                  <ChevronUp className="h-4 w-4 text-amber-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-400" />
                )}
              </button>
              {briefOpen && (
                <div className="border-t border-amber-500/20 px-5 py-4">
                  <div className="prose prose-sm prose-invert max-w-none text-slate-300 [&_h2]:text-amber-300 [&_h3]:text-amber-200 [&_strong]:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {briefResult}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Section 3: Payment Schedule Generator */}
      <section className="rounded-xl border border-navy-700 bg-navy-800/50 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-navy-700">
          <Calculator className="h-5 w-5 text-gold-400 shrink-0" />
          <h2 className="text-base font-semibold text-white">
            Payment Schedule Generator
          </h2>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                Total Amount (GHS)
              </label>
              <input
                type="number"
                value={scheduleForm.totalAmount}
                onChange={(e) =>
                  setScheduleForm((f) => ({ ...f, totalAmount: e.target.value }))
                }
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                No. of Instalments
              </label>
              <select
                value={scheduleForm.instalments}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    instalments: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              >
                {["1", "2", "3", "4", "6", "12"].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === "1" ? "instalment" : "instalments"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                First Payment Date
              </label>
              <input
                type="date"
                value={scheduleForm.firstPaymentDate}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    firstPaymentDate: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30 [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                Default Interest Rate (%) — optional
              </label>
              <input
                type="number"
                value={scheduleForm.interestRate}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    interestRate: e.target.value,
                  }))
                }
                placeholder="e.g. 2.5"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateSchedule}
            disabled={
              scheduleLoading ||
              !scheduleForm.totalAmount ||
              !scheduleForm.firstPaymentDate
            }
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scheduleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Schedule
          </button>

          {scheduleResult && (
            <div className="rounded-xl border border-navy-600 bg-white/5 p-5">
              <div className="prose prose-sm prose-invert max-w-none text-slate-200 [&_table]:w-full [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-400 [&_th]:uppercase [&_th]:tracking-wide [&_td]:text-sm [&_td]:text-slate-300 [&_table]:border-collapse [&_th]:border [&_th]:border-navy-600 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-navy-700 [&_td]:px-3 [&_td]:py-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {scheduleResult}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Generate Settlement Agreement */}
      <section className="rounded-xl border border-navy-700 bg-navy-800/50 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-navy-700">
          <FileText className="h-5 w-5 text-gold-400 shrink-0" />
          <h2 className="text-base font-semibold text-white">
            Settlement Agreement
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            Generate a legally structured settlement agreement incorporating the
            issue positions, payment schedule, and terms recorded above. You can
            open the drafting workspace manually or have CIMA AI draft it for
            you automatically.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(`/drafting?case_id=${caseId}`)}
              className="flex items-center gap-2 rounded-lg border border-navy-600 px-5 py-2.5 text-sm font-medium text-slate-400 transition hover:border-gold-500/40 hover:text-gold-400"
            >
              <ExternalLink className="h-4 w-4" />
              Open Drafting Workspace
            </button>

            <button
              onClick={handleGenerateWithAI}
              disabled={draftLoading}
              className="flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {draftLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Draft Settlement Agreement with AI
            </button>
          </div>

          {draftError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{draftError}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
