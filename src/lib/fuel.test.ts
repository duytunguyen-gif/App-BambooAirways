import { describe, it, expect } from "vitest";
import { computeFuelCalc, computeFuelEst } from "./fuel";
import { parseNum, sanitizeNumeric } from "./num";

describe("computeFuelCalc", () => {
  // User enters REMAIN and SUM; UPLIFT = SUM - REMAIN.
  const remain = { left: 1, center: 2, right: 3 };
  const sum = { left: 5, center: 7, right: 9 };
  // => uplift {4, 5, 6}, totals: remain 6, uplift 15, sum 21

  it("derives UPLIFT = SUM - REMAIN and sums columns (multiplier 1)", () => {
    const r = computeFuelCalc(remain, sum, 15, 2, 1);
    expect(r.remain.total).toBe(6); // 1+2+3
    expect(r.sum.total).toBe(21); // 5+7+9
    expect(r.uplift.left).toBe(4); // 5-1
    expect(r.uplift.total).toBe(15); // 21-6
  });

  it("applies the x10 / x100 multiplier to entered REMAIN and SUM", () => {
    const r10 = computeFuelCalc(remain, sum, 150, 2, 10);
    expect(r10.remain.center).toBe(20); // 2*10
    expect(r10.uplift.total).toBe(150); // (21-6)*10

    const r100 = computeFuelCalc(remain, sum, 1500, 2, 100);
    expect(r100.sum.right).toBe(900); // 9*100
    expect(r100.uplift.total).toBe(1500); // (21-6)*100
  });

  it("computes discrepancy = browser uplift - total uplift", () => {
    const r = computeFuelCalc(remain, sum, 16, 2, 1);
    expect(r.discrepancy).toBe(1); // 16 - 15
  });

  it("limit is thresholdPercent% of total uplift", () => {
    const r = computeFuelCalc(remain, sum, 15, 2, 1); // total uplift 15
    expect(r.limit).toBeCloseTo(0.3, 6); // 2% of 15
  });

  it("is GREEN (ok) when |discrepancy| is below the 2% limit", () => {
    // total uplift 15 -> limit 0.3
    const r = computeFuelCalc(remain, sum, 15.2, 2, 1);
    expect(r.discrepancy).toBeCloseTo(0.2, 6);
    expect(r.exceedsThreshold).toBe(false); // 0.2 < 0.3 -> green
  });

  it("is RED when |discrepancy| reaches or exceeds the 2% limit", () => {
    const equal = computeFuelCalc(remain, sum, 15.3, 2, 1);
    expect(equal.discrepancy).toBeCloseTo(0.3, 6);
    expect(equal.exceedsThreshold).toBe(true); // 0.3 >= 0.3 -> red

    const over = computeFuelCalc(remain, sum, 12, 2, 1);
    expect(over.discrepancy).toBe(-3);
    expect(over.exceedsThreshold).toBe(true); // |-3| >= 0.3 -> red
  });
});

describe("computeFuelEst", () => {
  const base = {
    taxi: 0.4,
    trip: 12,
    contingency: 0.6,
    alternate: 2,
    finalReserve: 1.5,
    extra: 0.5,
    remain: 3,
  };

  it("block fuel sums all required components (excludes remain)", () => {
    const r = computeFuelEst(base);
    expect(r.blockFuel).toBeCloseTo(17, 5); // 0.4+12+0.6+2+1.5+0.5
  });

  it("fuel to uplift = block - remain", () => {
    const r = computeFuelEst(base);
    expect(r.fuelToUplift).toBeCloseTo(14, 5); // 17 - 3
  });

  it("never reports a negative uplift", () => {
    const r = computeFuelEst({ ...base, remain: 100 });
    expect(r.fuelToUplift).toBe(0);
  });
});

describe("numeric helpers", () => {
  it("parses values and treats blanks/garbage as 0", () => {
    expect(parseNum("12.5")).toBe(12.5);
    expect(parseNum("2,5")).toBe(2.5);
    expect(parseNum("")).toBe(0);
    expect(parseNum("abc")).toBe(0);
    expect(parseNum("-")).toBe(0);
  });

  it("sanitizes to numeric-only input", () => {
    expect(sanitizeNumeric("12a.3b")).toBe("12.3");
    expect(sanitizeNumeric("1.2.3")).toBe("1.23");
    expect(sanitizeNumeric("-5")).toBe("5"); // negatives not allowed by default
    expect(sanitizeNumeric("-5", true)).toBe("-5");
  });
});
