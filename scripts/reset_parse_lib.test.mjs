import { describe, expect, it } from "vitest";
import {
  parseCircuitBreakers,
  parseResults,
  parsePage,
  splitSections,
} from "./reset_parse_lib.mjs";

const sampleText = `AUTO FLT - RUDDER TRIM 1(2) FAULT
Aircraft configuration prior to reset:
- Both engines stopped and hydraulics off.
Circuit breakers to reset:
LABEL | PANEL | NUMBER
FAC 1 | 49VU | B3, B4
FAC 2 | 122VU | M18, M19
RUD TRIM IND. | 121VU | M20
Steps to clear warning:
- First, reset associated FAC pushbutton. If no help, open associated FAC breakers for 10 seconds, then close.
Reset duration:
90 seconds.
Results of power up test or reset:
Pass: Fault messages disappear.
Fail: Message remains.
Notes:
- After reset, energize hydraulics, verify no Yaw damper message display.
Applicable deferrals:
MEL27-22-01 = Rudder Trim Systems.`;

describe("splitSections", () => {
  it("captures the fault title before the first section", () => {
    const { faultTitle } = splitSections(sampleText.split("\n"));
    expect(faultTitle).toBe("AUTO FLT - RUDDER TRIM 1(2) FAULT");
  });
});

describe("parseCircuitBreakers", () => {
  it("parses pipe-separated rows and skips the header", () => {
    const cbs = parseCircuitBreakers([
      "LABEL | PANEL | NUMBER",
      "FAC 1 | 49VU | B3, B4",
      "RUD TRIM IND. | 121VU | M20",
    ]);
    expect(cbs).toEqual([
      { label: "FAC 1", panel: "49VU", number: "B3, B4" },
      { label: "RUD TRIM IND.", panel: "121VU", number: "M20" },
    ]);
  });
});

describe("parseResults", () => {
  it("extracts pass and fail", () => {
    const r = parseResults(["Pass: gone.", "Fail: remains."]);
    expect(r.pass).toBe("gone.");
    expect(r.fail).toBe("remains.");
  });
});

describe("parsePage", () => {
  const rec = parsePage(sampleText, { sourceUrl: "http://x/y", ataChapter: "22" });

  it("produces a pending, unverified record", () => {
    expect(rec.verifiedStatus).toBe("pending");
    expect(rec.id).toBeNull();
  });
  it("parses all three circuit breakers", () => {
    expect(rec.circuitBreakersToReset).toHaveLength(3);
  });
  it("parses duration, results and deferrals", () => {
    expect(rec.resetDuration).toBe("90 seconds.");
    expect(rec.results.pass).toBe("Fault messages disappear.");
    expect(rec.results.fail).toBe("Message remains.");
    expect(rec.applicableDeferrals[0]).toContain("MEL27-22-01");
  });
});
