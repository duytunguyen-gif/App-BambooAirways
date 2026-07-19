/** Full-pipeline check on the REAL sample PDF (bytes → extract → parse →
 *  processed draft). The sample PDFs live in `sample/` (git-ignored), so this
 *  test SKIPS when the file is absent (CI, fresh clone) and runs locally where
 *  the real report is present. No AI key needed — uses the `none` provider, so
 *  it verifies the deterministic parser fix end-to-end from the actual PDF. */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { processReportFromBytes } from "./processReportFromBytes";
import { createNoneProvider } from "../ai/noneProvider";

const PDF = resolve(__dirname, "../../../../../sample/ADD B DEFECT LIST.pdf");
const havePdf = existsSync(PDF);

describe.skipIf(!havePdf)("processReportFromBytes — real sample B", () => {
  it("extracts full defect descriptions (not the truncated stub)", async () => {
    const bytes = new Uint8Array(readFileSync(PDF));
    const out = await processReportFromBytes(bytes, createNoneProvider());

    const a585 = out.aircraft.find((a) => a.registration === "VN-A585");
    expect(a585).toBeTruthy();

    // The two FWD/AFT cargo cards must now carry their full, DISTINCT statements
    // rather than both showing only "CARGO ARE DAMAGE".
    const cargo = a585!.parserDefects.filter((d) => /CARGO ARE DAMAGE/i.test(d.fullDescription));
    expect(cargo.length).toBeGreaterThanOrEqual(2);
    const fwd = cargo.find((d) => /132NF|FWD CARGO/i.test(d.fullDescription));
    const aft = cargo.find((d) => /151UF|AFT CARGO/i.test(d.fullDescription));
    expect(fwd, "FWD cargo full text present").toBeTruthy();
    expect(aft, "AFT cargo full text present").toBeTruthy();
    // and they are not the same truncated stub
    expect(fwd!.fullDescription).not.toBe(aft!.fullDescription);
    expect(fwd!.fullDescription.length).toBeGreaterThan("CARGO ARE DAMAGE".length);
  });
});
