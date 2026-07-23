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
  // Log the real error so it lands in Vercel's runtime logs, but never leak
  // provider/DB internals to the caller — unknown errors get a generic message.
  console.error("Unhandled API error:", e);
  return json({ error: "Lỗi máy chủ. Vui lòng thử lại." }, 500);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    return (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}
