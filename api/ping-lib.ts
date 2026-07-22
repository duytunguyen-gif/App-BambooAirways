/** TEMPORARY diagnostic — GET /api/ping-lib
 *
 *  Same Web signature but imports the shared _lib helpers (pulling in
 *  @supabase/supabase-js at module load) and reports which server env vars are
 *  PRESENT (booleans only — never values). Bisects import-layer crashes vs
 *  missing configuration. Remove once BUG1 is closed. */
import { json } from "./_lib/http";
import { getAdmin } from "./_lib/supabaseAdmin";

export function GET(): Response {
  const env = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    AI_PROVIDER: process.env.AI_PROVIDER ?? null,
  };
  let adminOk = false;
  let adminError: string | null = null;
  try {
    getAdmin();
    adminOk = true;
  } catch (e) {
    adminError = e instanceof Error ? e.message : "unknown";
  }
  return json({ ok: true, style: "web+lib", adminOk, adminError, env });
}
