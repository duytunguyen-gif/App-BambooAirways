/** Browser Supabase client. Uses ONLY the public anon key + URL — never the
 *  service role. Returns null when env is unconfigured so the rest of the app
 *  (Fuel/MEL/ECAM/CAAV) keeps working without a Supabase project.
 *
 *  @supabase/supabase-js is an optional dependency of the Defects module; if it
 *  is not installed the getter returns null and the Defects tab shows a setup
 *  notice instead of crashing. */
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let attempted = false;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anon);
}

/** Lazily create the singleton client. Returns null if unconfigured. */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (client) return client;
  if (attempted && !client) return null;
  attempted = true;
  if (!isSupabaseConfigured()) return null;
  const { createClient } = await import("@supabase/supabase-js");
  client = createClient(url!, anon!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
