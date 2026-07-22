/** TEMPORARY diagnostic — GET /api/ping-supa
 *  Imports ONLY @supabase/supabase-js (no relative imports). Isolates whether
 *  the npm package import crashes at module load. */
import { createClient } from "@supabase/supabase-js";

export function GET(): Response {
  return new Response(JSON.stringify({ ok: true, style: "supa", createClient: typeof createClient }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
