import { describe, expect, it } from "vitest";
import { validateFaultItem, validateFaultItems } from "./schema";

const good = {
  id: "auto-flt-rudder-trim-1-2-fault",
  aircraftType: "A320 Family",
  ataChapter: "22",
  ataTitle: "Auto Flight",
  faultTitle: "AUTO FLT - RUDDER TRIM 1(2) FAULT",
  circuitBreakersToReset: [{ label: "FAC 1", panel: "49VU", number: "B3, B4" }],
  results: { pass: "gone", fail: "remains" },
  verifiedStatus: "pending",
};

describe("validateFaultItem", () => {
  it("accepts a valid item and applies defaults", () => {
    const r = validateFaultItem(good);
    expect(r.ok).toBe(true);
    expect(r.value?.aircraftConfigurationPriorToReset).toEqual([]);
    expect(r.value?.stepsToClearWarning).toEqual([]);
  });

  it("rejects a record missing faultTitle", () => {
    const { faultTitle, ...rest } = good;
    void faultTitle;
    const r = validateFaultItem(rest);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("faultTitle");
  });

  it("rejects a record missing ataChapter", () => {
    const { ataChapter, ...rest } = good;
    void ataChapter;
    const r = validateFaultItem(rest);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("ataChapter");
  });

  it("rejects a circuit breaker with an empty panel", () => {
    const bad = {
      ...good,
      circuitBreakersToReset: [{ label: "FAC 1", panel: "", number: "B3" }],
    };
    const r = validateFaultItem(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("panel");
  });

  it("defaults verifiedStatus to pending when omitted", () => {
    const { verifiedStatus, ...rest } = good;
    void verifiedStatus;
    const r = validateFaultItem(rest);
    expect(r.ok).toBe(true);
    expect(r.value?.verifiedStatus).toBe("pending");
  });
});

describe("validateFaultItems (import batch)", () => {
  it("separates valid and invalid records with indexes", () => {
    const r = validateFaultItems([good, { ataChapter: "22" }]);
    expect(r.ok).toBe(false);
    expect(r.valid).toHaveLength(1);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].index).toBe(1);
  });

  it("rejects a non-array payload", () => {
    const r = validateFaultItems({ not: "an array" });
    expect(r.ok).toBe(false);
    expect(r.invalid[0].index).toBe(-1);
  });
});
