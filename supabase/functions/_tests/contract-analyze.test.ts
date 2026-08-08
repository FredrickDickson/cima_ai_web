import { describe, it, expect, beforeAll } from "vitest";
import { functionsUrl, authHeaders, getTestUserToken, SUPABASE_URL } from "./helpers";

const skip = !SUPABASE_URL;
let token: string;

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
  beforeAll(async () => {
    token = await getTestUserToken();
  });

  it("handles CORS preflight", async () => {
    const res = await fetch(functionsUrl("contract-analyze"), { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("rejects requests without a valid session", async () => {
    const res = await fetch(functionsUrl("contract-analyze"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text: sampleContract }),
    });
    expect(res.status).toBe(401);
  });

  // Fans out to Laws.Africa + case-law search + an 8192-token DeepSeek
  // completion — routinely takes 30-40s, past vitest's default 30s timeout.
  it("analyzes a contract and returns structured results", async () => {
    const res = await fetch(functionsUrl("contract-analyze"), {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ text: sampleContract }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("overall_risk_score");
    expect(data).toHaveProperty("ai_summary");
    expect(typeof data.overall_risk_score).toBe("number");
  }, 60000);
});
