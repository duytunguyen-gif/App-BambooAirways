/** TEMPORARY diagnostic — GET /api/ping
 *
 *  Web-signature function with ZERO imports. Bisects the live
 *  FUNCTION_INVOCATION_FAILED: if even this crashes, the problem is the
 *  handler signature / TS compile layer on Vercel; if it responds, the real
 *  handlers crash somewhere in their imports. Remove once BUG1 is closed. */
export function GET(): Response {
  return new Response(JSON.stringify({ ok: true, style: "web", at: new Date().toISOString() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
