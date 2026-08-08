// Shared CORS headers, replacing the identical inline block that used to be
// duplicated in every function. Origin is restricted to ALLOWED_ORIGINS (a
// comma-separated edge-function secret) when it's set; falls back to the
// previous "*" behavior when it isn't, so this can't break a deploy before
// the secret is configured — set ALLOWED_ORIGINS to your real prod origin(s)
// + http://localhost:5173 to lock this down.
export function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowed.length === 0
    ? "*"
    : (allowed.includes(origin) ? origin : allowed[0]);

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}
