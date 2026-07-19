import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDefects } from "./parseDefects";
import type { RawTextItem } from "./types";

function loadFixture(name: string): { items: RawTextItem[]; pageCount: number } {
  const p = resolve(__dirname, "__fixtures__", `${name}.items.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}

const B = loadFixture("b");
const C = loadFixture("c");
const reportB = parseDefects(B.items, B.pageCount);
const reportC = parseDefects(C.items, C.pageCount);

const acOf = (r: typeof reportB, reg: string) =>
  r.aircraft.find((a) => a.registration === reg)!;

describe("parseDefects — report header (#1,#2)", () => {
  it("detects category B and C", () => {
    expect(reportB.category).toBe("B");
    expect(reportC.category).toBe("C");
  });
  it("parses generated date/time", () => {
    expect(reportB.reportGeneratedAtRaw).toContain("16.Jul.2026");
    expect(reportB.reportGeneratedAt).toBe("2026-07-16T22:21:00");
    expect(reportC.reportGeneratedAt).toBe("2026-07-16T22:20:00");
  });
});

describe("parseDefects — aircraft headers + expected counts (#3,#14)", () => {
  const expectedB: Record<string, number> = {
    "VN-A227": 16, "VN-A585": 28, "VN-A594": 16, "VN-A596": 21, "VN-A597": 23,
  };
  const expectedC: Record<string, number> = {
    "VN-A227": 5, "VN-A585": 8, "VN-A594": 4, "VN-A596": 0, "VN-A597": 4,
  };

  it("B: expected Open Defects read from headers", () => {
    for (const [reg, n] of Object.entries(expectedB)) {
      expect(acOf(reportB, reg).expectedOpenCount).toBe(n);
    }
  });
  it("C: expected Open Defects read from headers", () => {
    for (const [reg, n] of Object.entries(expectedC)) {
      expect(acOf(reportC, reg).expectedOpenCount).toBe(n);
    }
  });

  it("B: parsed count matches expected for every aircraft", () => {
    for (const [reg, n] of Object.entries(expectedB)) {
      expect(acOf(reportB, reg).parsedOpenCount, reg).toBe(n);
    }
  });
  it("C: parsed count matches expected for every aircraft", () => {
    for (const [reg, n] of Object.entries(expectedC)) {
      expect(acOf(reportC, reg).parsedOpenCount, reg).toBe(n);
    }
  });
});

describe("parseDefects — Open Defects = 0 aircraft still present (#4)", () => {
  it("VN-A596 in C report exists with 0 defects", () => {
    const ac = acOf(reportC, "VN-A596");
    expect(ac).toBeTruthy();
    expect(ac.expectedOpenCount).toBe(0);
    expect(ac.parsedOpenCount).toBe(0);
  });
});

describe("parseDefects — multi-limit grouping (#8)", () => {
  it("same WO with Day/FH/FC becomes one defect with multiple limits", () => {
    const a227 = acOf(reportB, "VN-A227");
    const multi = a227.defects.find((d) => d.woNumber === "982402");
    expect(multi).toBeTruthy();
    expect(multi!.limits.length).toBeGreaterThanOrEqual(2);
    const types = multi!.limits.map((l) => l.limitType).sort();
    expect(types).toContain("fc");
    expect(types).toContain("fh");
  });
});

describe("parseDefects — WO grouping reduces cards below row count (#8)", () => {
  // Grouped defect counts = number of viewer-facing cards (multi-limit WOs
  // collapse). Row-based parsedOpenCount stays equal to the header above.
  const groupedB: Record<string, number> = {
    "VN-A227": 15, "VN-A585": 24, "VN-A594": 12, "VN-A596": 19, "VN-A597": 18,
  };
  it("B: grouped defect count is below the row-based header where multi-limit exists", () => {
    for (const [reg, n] of Object.entries(groupedB)) {
      expect(acOf(reportB, reg).defects.length, reg).toBe(n);
    }
  });
});

describe("parseDefects — Part Request rows ignored (#9,#10)", () => {
  it("no defect key contains a part number and counts are exact", () => {
    // if part rows leaked in, parsed counts would exceed expected
    for (const ac of reportB.aircraft) {
      expect(ac.parsedOpenCount).toBe(ac.expectedOpenCount);
    }
  });
});

describe("parseDefects — concession detection (#12)", () => {
  it("at least one concession defect detected in B", () => {
    const withConcession = reportB.aircraft
      .flatMap((a) => a.defects)
      .filter((d) => d.isConcession);
    expect(withConcession.length).toBeGreaterThan(0);
    for (const d of withConcession) {
      expect(d.concessionDueDate).toBe(d.currentDueDate);
    }
  });
});

describe("parseDefects — count reconciliation (#14)", () => {
  it("no COUNT_MISMATCH warnings for the clean sample reports", () => {
    expect(reportB.warnings.filter((w) => w.code === "COUNT_MISMATCH")).toHaveLength(0);
    expect(reportC.warnings.filter((w) => w.code === "COUNT_MISMATCH")).toHaveLength(0);
  });
});

describe("parseDefects — raised date = Iss.Date (#6)", () => {
  it("issued dates parse to ISO", () => {
    const withDate = reportB.aircraft
      .flatMap((a) => a.defects)
      .filter((d) => d.issuedDate);
    expect(withDate.length).toBeGreaterThan(0);
    for (const d of withDate) expect(d.issuedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
