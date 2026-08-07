import { useState } from "react";
import { supabase } from "../lib/supabase";

export function useSharpenQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sharpen(text: string, kind = "legal query"): Promise<string | null> {
    if (!text.trim()) return null;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `You are a legal query editor. Rewrite the draft ${kind} below to be clear, specific, and well-structured — resolve ambiguity, add precise legal terminology where appropriate, and keep the author's original intent. Return ONLY the rewritten text, no preamble, no quotation marks.\n\nDraft:\n"${text}"`,
            },
          ],
          context: "analysis",
        }),
      });
      if (!res.ok) throw new Error(`Sharpen request failed (${res.status})`);
      const data = await res.json();
      const refined = data.content?.trim();
      if (!refined) throw new Error("Sharpen returned an empty response.");
      return refined;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sharpen query.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { sharpen, loading, error };
}
