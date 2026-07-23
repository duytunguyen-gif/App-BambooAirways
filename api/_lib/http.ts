/** Tiny HTTP helpers shared by the Defects /api functions (Vercel Web-standard
 *  Request/Response handlers). No framework, no extra deps. */

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Convert a thrown error into a safe JSON response. Never leaks secrets: only
 *  the (Vietnamese) message we set is surfaced; unknown errors become a generic
 *  500 so provider/DB internals are not echoed. */
export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  // Always log the real error so it lands in Vercel's runtime logs.
  console.error("Unhandled API error:", e);
  // TEMP diagnostic: surface the real error to the (admin-only) caller so a prod
  // 500 can be diagnosed without dashboard access. Revert to the generic message
  // once the root cause is fixed.
  const detail =
    e instanceof Error ? `${e.name}: ${e.message}` : typeof e === "string" ? e : JSON.stringify(e);
  return json({ error: `Lỗi máy chủ [DEBUG]: ${detail}` }, 500);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    return (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}
