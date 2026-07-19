import { describe, it, expect } from "vitest";
import { sortRegistrations, sortByRaisedNewest, defectMatches, registrationNumber } from "./sortSearch";
import { severityForDaysLeft, nearestDue, defectDueInfo } from "./severity";
import { diffReports } from "./history";
import { formatFreshness, daysUntil } from "../utils/dates";
import type { Defect } from "../model";

function mkDefect(p: Partial<Defect>): Defect {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    category: p.category ?? "B",
    registration: p.registration ?? "VN-A227",
    defectKey: p.defectKey ?? "k",
    woNumber: p.woNumber ?? null,
    defectIdRaw: p.defectIdRaw ?? null,
    defectIdNormalized: p.defectIdNormalized ?? null,
    shortTitle: p.shortTitle ?? "TITLE",
    fullDescription: p.fullDescription ?? "DESC",
    issuedDate: p.issuedDate ?? null,
    issueStation: p.issueStation ?? null,
    docReference: p.docReference ?? null,
    melReference: p.melReference ?? null,
    melCategory: p.melCategory ?? null,
    currentDueDate: p.currentDueDate ?? null,
    originalDueDate: p.originalDueDate ?? null,
    concessionDueDate: p.concessionDueDate ?? null,
    isConcession: p.isConcession ?? false,
    rawDeclaredDeadline: p.rawDeclaredDeadline ?? null,
    limits: p.limits ?? [],
    sourcePageStart: p.sourcePageStart ?? null,
    sourcePageEnd: p.sourcePageEnd ?? null,
  };
}

describe("numeric aircraft sort (#5)", () => {
  it("sorts by numeric part, not lexicographically", () => {
    expect(sortRegistrations(["VN-A597", "VN-A227", "VN-A96", "VN-A594", "VN-A585"]))
      .toEqual(["VN-A96", "VN-A227", "VN-A585", "VN-A594", "VN-A597"]);
  });
  it("extracts registration number", () => {
    expect(registrationNumber("VN-A227")).toBe(227);
  });
});

describe("raised newest first (#7)", () => {
  it("orders by Iss.Date desc, nulls last", () => {
    const list = [
      mkDefect({ id: "a", issuedDate: "2026-07-12" }),
      mkDefect({ id: "b", issuedDate: "2026-07-15" }),
      mkDefect({ id: "c", issuedDate: null }),
    ];
    expect(sortByRaisedNewest(list).map((d) => d.id)).toEqual(["b", "a", "c"]);
  });
});

describe("search across fields (#16)", () => {
  const d = mkDefect({
    registration: "VN-A585",
    woNumber: "1040879",
    defectIdRaw: "ADD B227418-09",
    melReference: "25-20-02A",
    shortTitle: "CRACKS ON THERMAL BLANKET",
    fullDescription: "ENG 1 cracks found",
  });
  it("matches registration, WO, ID, MEL, title, description", () => {
    for (const q of ["a585", "1040879", "227418", "25-20", "thermal", "eng 1"]) {
      expect(defectMatches(d, q), q).toBe(true);
    }
    expect(defectMatches(d, "zzz")).toBe(false);
  });
});

describe("severity buckets (#7E)", () => {
  it("maps days-left to colours", () => {
    expect(severityForDaysLeft(-1)).toBe("red");
    expect(severityForDaysLeft(3)).toBe("orange");
    expect(severityForDaysLeft(20)).toBe("amber");
    expect(severityForDaysLeft(45)).toBe("gray");
    expect(severityForDaysLeft(null)).toBe("gray");
  });
});

describe("nearest due priority (#8)", () => {
  const today = "2026-07-18";
  it("overdue beats soon-due", () => {
    const overdue = mkDefect({ id: "o", currentDueDate: "2026-07-10" });
    const soon = mkDefect({ id: "s", currentDueDate: "2026-07-20" });
    expect(nearestDue([soon, overdue], today)!.defect.id).toBe("o");
  });
  it("earliest calendar due wins among future dates", () => {
    const a = mkDefect({ id: "a", currentDueDate: "2026-08-01" });
    const b = mkDefect({ id: "b", currentDueDate: "2026-07-25" });
    expect(nearestDue([a, b], today)!.defect.id).toBe("b");
  });
  it("concession due is the effective due", () => {
    const d = mkDefect({ isConcession: true, currentDueDate: "2099-01-01", concessionDueDate: "2026-07-19" });
    const info = defectDueInfo(d, today);
    expect(info.dueISO).toBe("2026-07-19");
    expect(info.severity).toBe("orange");
  });
});

describe("history diff (#17)", () => {
  it("classifies NEW / UPDATED / UNCHANGED / REMOVED", () => {
    const prev = [
      mkDefect({ registration: "VN-A227", woNumber: "1", currentDueDate: "2026-07-20" }),
      mkDefect({ registration: "VN-A227", woNumber: "2", currentDueDate: "2026-07-21" }),
    ];
    const next = [
      mkDefect({ registration: "VN-A227", woNumber: "2", currentDueDate: "2026-08-01" }), // updated
      mkDefect({ registration: "VN-A227", woNumber: "3", currentDueDate: "2026-07-22" }), // new
    ];
    const events = diffReports(prev, next);
    const byType = Object.fromEntries(events.map((e) => [e.defectKey, e.eventType]));
    expect(byType["B|VN-A227|WO:2"]).toBe("UPDATED");
    expect(byType["B|VN-A227|WO:3"]).toBe("NEW");
    expect(byType["B|VN-A227|WO:1"]).toBe("REMOVED_FROM_LATEST_REPORT");
  });
});

describe("freshness format (#24)", () => {
  it("renders HH:mm / dd/MM/yyyy", () => {
    expect(formatFreshness("2026-07-16T22:21:00")).toBe("22:21 / 16/07/2026");
    expect(formatFreshness(null)).toBe("Chưa có dữ liệu");
  });
});

describe("date-only day math (Asia/Ho_Chi_Minh)", () => {
  it("computes whole days until", () => {
    expect(daysUntil("2026-07-21", "2026-07-18")).toBe(3);
    expect(daysUntil("2026-07-10", "2026-07-18")).toBe(-8);
  });
});
