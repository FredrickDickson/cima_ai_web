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

export const USD_TO_GHS_RATE = 11.7;

export const PLAN_PRICES_USD: Record<string, Record<string, number>> = {
  pro: { monthly: 29, annually: 290 },
  max: { monthly: 79, annually: 790 },
};

export function planAmountPesewa(plan: string, interval: string): number {
  const usd = PLAN_PRICES_USD[plan]?.[interval];
  if (!usd) throw new Error("INVALID_PLAN");
  return Math.round(usd * USD_TO_GHS_RATE * 100);
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
