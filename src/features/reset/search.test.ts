import { describe, expect, it } from "vitest";
import type { ResetFaultItem } from "./types";
import { matchesQuery, searchItems, sortItems } from "./search";

function item(partial: Partial<ResetFaultItem>): ResetFaultItem {
  return {
    id: "x",
    aircraftType: "A320 Family",
    ataChapter: "22",
    ataTitle: "Auto Flight",
    faultTitle: "SAMPLE FAULT",
    aircraftConfigurationPriorToReset: [],
    circuitBreakersToReset: [],
    stepsToClearWarning: [],
    results: {},
    verifiedStatus: "pending",
    ...partial,
  };
}

const rudder = item({
  id: "auto-flt-rudder-trim-1-2-fault",
  faultTitle: "AUTO FLT - RUDDER TRIM 1(2) FAULT",
  system: "Rudder Trim / FAC",
  circuitBreakersToReset: [
    { label: "FAC 1", panel: "49VU", number: "B3, B4" },
    { label: "RUD TRIM IND.", panel: "121VU", number: "M20" },
  ],
  signOffRefs: ["AMM22-91-00-710-001. (AFS Ground Scan)"],
  applicableDeferrals: ["MEL27-22-01 = Rudder Trim Systems."],
  verifiedStatus: "verified",
  tags: ["FAC", "RUDDER TRIM"],
});

const eng = item({
  id: "eng-fault",
  ataChapter: "70",
  ataTitle: "Engine",
  faultTitle: "ENG 1 FAULT",
  verifiedStatus: "pending",
});

const all = [rudder, eng];

describe("matchesQuery", () => {
  it("matches on fault title (case-insensitive)", () => {
    expect(matchesQuery(rudder, "rudder trim")).toBe(true);
  });
  it("matches on CB panel number", () => {
    expect(matchesQuery(rudder, "121VU")).toBe(true);
  });
  it("matches on MEL reference", () => {
    expect(matchesQuery(rudder, "MEL27-22-01")).toBe(true);
  });
  it("requires ALL terms (AND)", () => {
    expect(matchesQuery(rudder, "rudder engine")).toBe(false);
  });
  it("empty query matches everything", () => {
    expect(matchesQuery(eng, "   ")).toBe(true);
  });
});

describe("searchItems", () => {
  it("filters by query", () => {
    expect(searchItems(all, "rudder").map((i) => i.id)).toEqual([
      "auto-flt-rudder-trim-1-2-fault",
    ]);
  });
  it("filters by ATA chapter", () => {
    expect(searchItems(all, "", { ataNumber: "70" }).map((i) => i.id)).toEqual([
      "eng-fault",
    ]);
  });
  it("filters by verified status", () => {
    expect(
      searchItems(all, "", { verifiedStatus: "verified" }).map((i) => i.id)
    ).toEqual(["auto-flt-rudder-trim-1-2-fault"]);
  });
  it("filters by hasCb", () => {
    expect(searchItems(all, "", { hasCb: true }).map((i) => i.id)).toEqual([
      "auto-flt-rudder-trim-1-2-fault",
    ]);
  });
  it("filters by favorites", () => {
    const favs = new Set(["eng-fault"]);
    expect(
      searchItems(all, "", { favoriteIds: favs }).map((i) => i.id)
    ).toEqual(["eng-fault"]);
  });
});

describe("sortItems", () => {
  it("sorts A-Z by fault title", () => {
    expect(sortItems(all, "az").map((i) => i.faultTitle)).toEqual([
      "AUTO FLT - RUDDER TRIM 1(2) FAULT",
      "ENG 1 FAULT",
    ]);
  });
  it("puts verified items first", () => {
    expect(sortItems(all, "verifiedFirst").map((i) => i.id)[0]).toBe(
      "auto-flt-rudder-trim-1-2-fault"
    );
  });
  it("sorts by most circuit breakers", () => {
    expect(sortItems(all, "mostCb").map((i) => i.id)[0]).toBe(
      "auto-flt-rudder-trim-1-2-fault"
    );
  });
  it("sorts by recency using the provided order map", () => {
    const order = new Map([
      ["eng-fault", 0],
      ["auto-flt-rudder-trim-1-2-fault", 1],
    ]);
    expect(sortItems(all, "recent", order).map((i) => i.id)).toEqual([
      "eng-fault",
      "auto-flt-rudder-trim-1-2-fault",
    ]);
  });
});
