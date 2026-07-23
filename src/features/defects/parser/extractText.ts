/** PDF → RawTextItem[] extraction using pdfjs-dist. This is the ONLY parser
 *  module that depends on pdfjs; it runs server-side (Vercel function / Node
 *  script), never in the browser bundle. Keep it thin — all interpretation
 *  lives in parseDefects.ts so it can be tested from fixtures. */
import type { RawTextItem } from "./types.js";

export interface ExtractResult {
  items: RawTextItem[];
  pageCount: number;
}

/** Extract positioned text runs from a PDF supplied as bytes. */
export async function extractTextItems(data: Uint8Array): Promise<ExtractResult> {
  // Lazy import so bundlers never pull pdfjs into a client build.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const items: RawTextItem[] = [];
  for (let page = 1; page <= doc.numPages; page++) {
    const p = await doc.getPage(page);
    const tc = await p.getTextContent();
    for (const it of tc.items as Array<{ str: string; transform: number[] }>) {
      if (typeof it.str !== "string") continue;
      items.push({
        page,
        str: it.str,
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
      });
    }
  }
  const pageCount = doc.numPages;
  await doc.cleanup();
  return { items, pageCount };
}
