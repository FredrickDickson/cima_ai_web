import { describe, it, expect } from "vitest";
import { functionsUrl, authHeaders, SUPABASE_URL, SUPABASE_SERVICE_KEY } from "./helpers";

const skip = !SUPABASE_URL;

const sampleContract = `
SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into between Company A ("Provider")
and Company B ("Client") on January 1, 2026.

1. SCOPE OF SERVICES: Provider shall deliver consulting services as described in Exhibit A.
2. PAYMENT TERMS: Client shall pay Provider $10,000 monthly within 30 days of invoice.
3. TERM: This Agreement shall be effective for 12 months from the date of execution.
4. TERMINATION: Either party may terminate with 30 days written notice.
5. GOVERNING LAW: This Agreement shall be governed by the laws of Ghana.
6. ARBITRATION: Any disputes shall be resolved by arbitration under the Ghana ADR Act 2010.
`;

describe.skipIf(skip)("contract-analyze edge function", () => {
  it("handles CORS preflight", async () => {
    const res = await fetch(functionsUrl("contract-analyze"), { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("analyzes a contract and returns structured results", async () => {
    const res = await fetch(functionsUrl("contract-analyze"), {
      method: "POST",
      headers: authHeaders(SUPABASE_SERVICE_KEY),
      body: JSON.stringify({
        text: sampleContract,
        user_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("overall_risk_score");
    expect(data).toHaveProperty("ai_summary");
    expect(typeof data.overall_risk_score).toBe("number");
  });
});
