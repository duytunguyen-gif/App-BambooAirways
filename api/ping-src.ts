/** TEMPORARY diagnostic — GET /api/ping-src
 *  Imports a module from src/ (outside api/) with an explicit .js specifier.
 *  Verifies Vercel's ESM function build traces + compiles TS files outside the
 *  api directory. */
import { parseAmosDate } from "../src/features/defects/utils/dates.js";

export function GET(): Response {
  return new Response(
    JSON.stringify({ ok: true, style: "src", parsed: parseAmosDate("05.Jan.2026") }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
