/** Generate a raw text-item fixture from a sample AMOS defect PDF.
 *
 *  Usage:
 *    node scripts/extract_defect_fixture.mjs "sample/ADD B DEFECT LIST.pdf" b
 *    node scripts/extract_defect_fixture.mjs "sample/ADD C DEFECT LIST.pdf" c
 *
 *  Writes src/features/defects/parser/__fixtures__/<name>.items.json which the
 *  unit tests consume. The fixture contains only extracted text runs (no PDF
 *  binary). Regenerate whenever the sample reports change.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [, , file, name] = process.argv;
if (!file || !name) {
  console.error('Usage: node scripts/extract_defect_fixture.mjs <pdf> <name>');
  process.exit(1);
}

const data = new Uint8Array(readFileSync(file));
const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
const items = [];
for (let page = 1; page <= doc.numPages; page++) {
  const p = await doc.getPage(page);
  const tc = await p.getTextContent();
  for (const it of tc.items) {
    if (typeof it.str !== "string") continue;
    items.push({ page, str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) });
  }
}

const outDir = resolve(__dirname, "../src/features/defects/parser/__fixtures__");
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, `${name}.items.json`);
writeFileSync(outFile, JSON.stringify({ pageCount: doc.numPages, items }));
console.log(`Wrote ${outFile} (${items.length} items, ${doc.numPages} pages)`);
