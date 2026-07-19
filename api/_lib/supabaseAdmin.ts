/** Service-role Supabase client for /api functions. Bypasses RLS, so it is used
 *  for ALL Defects writes (upload metadata, processing, edits, publish, cleanup,
 *  approvals). Server-only: reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
 *  env; these must NEVER carry a VITE_ prefix. Do not import from client code. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http";

let admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError(500, "Máy chủ chưa cấu hình Supabase service role.");
  }
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
