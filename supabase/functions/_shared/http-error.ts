// Typed error carrying an HTTP status, so every function's top-level catch
// can return the right status code (401/400/429) instead of always 500.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(error: unknown, corsHeaders: Record<string, string>): Response {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unknown error";
  if (status === 500) console.error(error);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
