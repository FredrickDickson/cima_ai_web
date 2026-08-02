import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "./supabase";

export interface AiActionUsage {
  used: number;
  cap: number | null;
  extra: number;
  percentUsed: number | null;
  /** True once the monthly allowance and any top-up credits are both spent. */
  isExhausted: boolean;
}

/** Derives the signed-in user's AI-action usage against their plan cap, via the `plan_ai_action_cap` RPC. */
export function useAiActionUsage(): AiActionUsage {
  const { profile } = useAuth();
  const [cap, setCap] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    supabase.rpc("plan_ai_action_cap" as never, { p_plan: profile.plan }).then(({ data }) => {
      if (!cancelled && typeof data === "number") setCap(data);
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const used = profile?.monthly_ai_actions_used ?? 0;
  const extra = profile?.extra_ai_actions ?? 0;
  const percentUsed = cap !== null && cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : null;
  const isExhausted = cap !== null && used >= cap && extra <= 0;

  return { used, cap, extra, percentUsed, isExhausted };
}
