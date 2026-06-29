import { describe, it, expect } from "vitest";
import {
  computeDueDate,
  formatDate,
  melStatus,
  parseInputDate,
  todayUtc,
} from "./mel";

describe("parseInputDate / formatDate", () => {
  it("round-trips a valid date", () => {
    const d = parseInputDate("2026-06-28")!;
    expect(formatDate(d)).toBe("28/06/2026");
  });

  it("rejects malformed or impossible dates", () => {
    expect(parseInputDate("2026-13-01")).toBeNull();
    expect(parseInputDate("2026-02-31")).toBeNull();
    expect(parseInputDate("28/06/2026")).toBeNull();
  });
});

describe("computeDueDate", () => {
  const defect = parseInputDate("2026-06-28")!;

  it("matches the reference mockup intervals (exclude day of discovery = default)", () => {
    expect(formatDate(computeDueDate(defect, 3, true))).toBe("01/07/2026"); // B
    expect(formatDate(computeDueDate(defect, 10, true))).toBe("08/07/2026"); // C
    expect(formatDate(computeDueDate(defect, 120, true))).toBe("26/10/2026"); // D
    expect(formatDate(computeDueDate(defect, 180, true))).toBe("25/12/2026"); // C Defect
  });

  it("counts the day of discovery when exclude is off (interval - 1)", () => {
    expect(formatDate(computeDueDate(defect, 3, false))).toBe("30/06/2026");
  });
});

describe("melStatus", () => {
  const due = parseInputDate("2026-06-28")!; // valid through end of 28/06 UTC

  it("is not overdue early on the due day", () => {
    const now = new Date(Date.UTC(2026, 5, 28, 6, 0, 0));
    const s = melStatus(due, now);
    expect(s.overdue).toBe(false);
    expect(s.within24h).toBe(true); // 18h left
    expect(s.hoursRemaining).toBe(18);
  });

  it("is overdue once the due UTC day has passed", () => {
    const now = new Date(Date.UTC(2026, 5, 29, 0, 0, 1));
    const s = melStatus(due, now);
    expect(s.overdue).toBe(true);
  });

  it("flags within-24h the day before expiry", () => {
    const now = new Date(Date.UTC(2026, 5, 28, 1, 0, 0)); // 23h left
    expect(melStatus(due, now).within24h).toBe(true);

    const earlier = new Date(Date.UTC(2026, 5, 27, 12, 0, 0)); // 36h left
    expect(melStatus(due, earlier).within24h).toBe(false);
  });
});

describe("todayUtc", () => {
  it("returns the UTC calendar day", () => {
    const now = new Date(Date.UTC(2026, 5, 28, 23, 30, 0));
    expect(formatDate(todayUtc(now))).toBe("28/06/2026");
  });
});
