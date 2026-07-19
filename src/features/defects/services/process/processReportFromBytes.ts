/** Server-side convenience wrapper: PDF bytes ──▶ processed draft.
 *  Pulls in pdfjs (via extractTextItems) so it must only run server-side
 *  (Vercel function / Node script / test), never in the client bundle. */
import { extractTextItems } from "../../parser/extractText";
import { processReport, type ProcessedReport } from "./processReport";
import type { AiProvider } from "../ai/types";

export async function processReportFromBytes(
  data: Uint8Array,
  provider: AiProvider
): Promise<ProcessedReport> {
  const { items, pageCount } = await extractTextItems(data);
  return processReport({ items, pageCount, provider });
}
