import { describe, it, expect } from "vitest";
import { functionsUrl, authHeaders, SUPABASE_URL } from "./helpers";

const skip = !SUPABASE_URL;

describe.skipIf(skip)("legal-search edge function", () => {
  it("handles CORS preflight", async () => {
    const res = await fetch(functionsUrl("legal-search"), { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("returns search results for a query", async () => {
    const res = await fetch(functionsUrl("legal-search"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        query: "Ghana ADR Act 2010 arbitration clause",
        jurisdiction: "ghana",
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("sources");
    expect(data).toHaveProperty("ai_analysis");
  });

  it("returns results without jurisdiction filter", async () => {
    const res = await fetch(functionsUrl("legal-search"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ query: "force majeure clause" }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("sources");
  });
});
