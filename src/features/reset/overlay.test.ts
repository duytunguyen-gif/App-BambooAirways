import { describe, expect, it } from "vitest";
import { applyOverlay, type OverlayState } from "./storage";
import type { ResetFaultItem } from "./types";

function item(id: string, faultTitle = id): ResetFaultItem {
  return {
    id,
    aircraftType: "A320 Family",
    ataChapter: "22",
    ataTitle: "Auto Flight",
    faultTitle,
    aircraftConfigurationPriorToReset: [],
    circuitBreakersToReset: [],
    stepsToClearWarning: [],
    results: {},
    verifiedStatus: "pending",
  };
}

describe("applyOverlay", () => {
  const base = [item("a"), item("b")];

  it("returns base unchanged for an empty overlay", () => {
    const o: OverlayState = { items: {}, deleted: [] };
    expect(applyOverlay(base, o).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("drops deleted ids", () => {
    const o: OverlayState = { items: {}, deleted: ["a"] };
    expect(applyOverlay(base, o).map((i) => i.id)).toEqual(["b"]);
  });

  it("overrides an edited item by id", () => {
    const o: OverlayState = { items: { a: item("a", "EDITED") }, deleted: [] };
    expect(applyOverlay(base, o).find((i) => i.id === "a")?.faultTitle).toBe(
      "EDITED"
    );
  });

  it("appends brand-new items", () => {
    const o: OverlayState = { items: { c: item("c") }, deleted: [] };
    expect(applyOverlay(base, o).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("deletion wins over an overlay edit of the same id", () => {
    const o: OverlayState = { items: { a: item("a", "EDITED") }, deleted: ["a"] };
    expect(applyOverlay(base, o).map((i) => i.id)).toEqual(["b"]);
  });
});
