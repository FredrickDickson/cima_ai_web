import { describe, it, expect, beforeAll } from "vitest";
import { functionsUrl, authHeaders, getTestUserToken, SUPABASE_URL } from "./helpers";

const skip = !SUPABASE_URL;
let token: string;

describe.skipIf(skip)("ai-chat edge function", () => {
  beforeAll(async () => {
    token = await getTestUserToken();
  });

  it("handles CORS preflight", async () => {
    const res = await fetch(functionsUrl("ai-chat"), { method: "OPTIONS" });
    expect(res.status).toBe(200);
  });

  it("rejects requests without a valid session", async () => {
    const res = await fetch(functionsUrl("ai-chat"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], context: "general" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns a chat completion", async () => {
    const res = await fetch(functionsUrl("ai-chat"), {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        messages: [{ role: "user", content: "What is arbitration? Reply in one sentence." }],
        context: "general",
      }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(typeof data.content).toBe("string");
    expect(data.content.length).toBeGreaterThan(0);
  });

  it("handles empty messages gracefully", async () => {
    const res = await fetch(functionsUrl("ai-chat"), {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ messages: [], context: "general" }),
    });
    expect(res.status).toBeLessThan(500);
  });
});
