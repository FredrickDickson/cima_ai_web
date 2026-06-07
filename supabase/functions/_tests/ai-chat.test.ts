import { describe, it, expect } from "vitest";
import { functionsUrl, authHeaders, SUPABASE_URL } from "./helpers";

const skip = !SUPABASE_URL;

describe.skipIf(skip)("ai-chat edge function", () => {
  it("handles CORS preflight", async () => {
    const res = await fetch(functionsUrl("ai-chat"), { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("returns a chat completion", async () => {
    const res = await fetch(functionsUrl("ai-chat"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: "What is arbitration? Reply in one sentence." }],
        context: "general",
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.choices).toBeDefined();
    expect(data.choices[0].message.content.length).toBeGreaterThan(0);
  });

  it("handles empty messages gracefully", async () => {
    const res = await fetch(functionsUrl("ai-chat"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: [], context: "general" }),
    });
    expect(res.status).toBeLessThan(500);
  });
});
