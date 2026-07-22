/** TEMPORARY diagnostic — GET /api/ping-rel
 *  Imports ONLY the relative ./_lib/http helper (no npm packages). Isolates
 *  whether extensionless relative imports crash the ESM build. */
import { json } from "./_lib/http.js";

export function GET(): Response {
  return json({ ok: true, style: "rel" });
}
