/**
 * Shared Paystack helpers for CIMA AI Edge Functions.
 *
 * Ghana-issued Paystack integrations cannot charge in USD (Paystack's USD
 * support is Kenya/Nigeria only — see docs/Paystack docs/api reference.md's
 * currency table) — we display USD-denominated prices in the app but the
 * actual charge is always in GHS. USD_TO_GHS_RATE is a fixed, periodically-
 * reviewed constant, not live FX; update it here when it drifts too far
 * from the real rate.
 */

export const USD_TO_GHS_RATE = 15;

export const PLAN_PRICES_USD: Record<string, Record<string, number>> = {
  pro: { monthly: 29, annually: 290 },
  max: { monthly: 79, annually: 790 },
};

export function planAmountPesewa(plan: string, interval: string): number {
  const usd = PLAN_PRICES_USD[plan]?.[interval];
  if (!usd) throw new Error("INVALID_PLAN");
  return Math.round(usd * USD_TO_GHS_RATE * 100);
}

// Paystack Plan objects (created once via `POST /plan`, see the `payment`
// branch plan doc's Part 3 rework) — plan_codes live as Supabase secrets
// rather than hardcoded here so test/live keys can point at different Plans
// without a code change.
const PLAN_CODE_ENV_KEYS: Record<string, Record<string, string>> = {
  pro: { monthly: "PAYSTACK_PLAN_CODE_PRO_MONTHLY", annually: "PAYSTACK_PLAN_CODE_PRO_ANNUALLY" },
  max: { monthly: "PAYSTACK_PLAN_CODE_MAX_MONTHLY", annually: "PAYSTACK_PLAN_CODE_MAX_ANNUALLY" },
};

export function planCode(plan: string, interval: string): string {
  const envKey = PLAN_CODE_ENV_KEYS[plan]?.[interval];
  if (!envKey) throw new Error("INVALID_PLAN");
  const code = Deno.env.get(envKey);
  if (!code) throw new Error(`Paystack plan code not configured (missing secret ${envKey})`);
  return code;
}

export async function paystackFetch(path: string, options: RequestInit = {}): Promise<any> {
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) throw new Error("Paystack is not configured on this server");

  const res = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok || data.status === false) {
    throw new Error(data.message ?? `Paystack request failed (${res.status})`);
  }
  return data;
}
