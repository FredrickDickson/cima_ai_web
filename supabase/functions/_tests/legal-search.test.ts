import { describe, it, expect, beforeAll } from "vitest";
import { functionsUrl, authHeaders, getTestUserToken, SUPABASE_URL } from "./helpers";

const skip = !SUPABASE_URL;
let token: string;

describe.skipIf(skip)("legal-search edge function", () => {
  beforeAll(async () => {
    token = await getTestUserToken();
  });

  it("handles CORS preflight", async () => {
    const res = await fetch(functionsUrl("legal-search"), { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("rejects requests without a valid session", async () => {
    const res = await fetch(functionsUrl("legal-search"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ query: "force majeure clause" }),
    });
    expect(res.status).toBe(401);
  });

  // Fans out to Laws.Africa + HuggingFace + Tavily + CourtListener + DeepSeek —
  // routinely takes 30-40s, past vitest's default 30s test timeout.
  it("returns search results for a query", async () => {
    const res = await fetch(functionsUrl("legal-search"), {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        query: "Ghana ADR Act 2010 arbitration clause",
        jurisdiction: "ghana",
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("sources");
    expect(data).toHaveProperty("ai_analysis");
  }, 60000);

  it("returns results without jurisdiction filter", async () => {
    const res = await fetch(functionsUrl("legal-search"), {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ query: "force majeure clause" }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("sources");
  }, 60000);
});
