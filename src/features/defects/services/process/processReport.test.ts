import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { processReport } from "./processReport";
import { createNoneProvider } from "../ai/noneProvider";
import type { AiProvider } from "../ai/types";
import type { RawTextItem } from "../../parser/types";

function loadFixture(name: string): { items: RawTextItem[]; pageCount: number } {
  const p = resolve(__dirname, "../../parser/__fixtures__", `${name}.items.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}
const B = loadFixture("b");

describe("processReport — parser always present", () => {
  it("returns deterministic cards for every aircraft with none provider", async () => {
    const out = await processReport({
      items: B.items,
      pageCount: B.pageCount,
      provider: createNoneProvider(),
    });
    expect(out.report.aircraft.length).toBeGreaterThan(0);
    expect(out.aiUsed).toBe(false);
    expect(out.aiProvider).toBe("none");
    for (const ac of out.aircraft) {
      expect(ac.parserDefects.length).toBeGreaterThan(0);
      expect(ac.aiDefects).toBeNull(); // none provider adds no suggestion
      expect(ac.aiOk).toBe(false);
    }
  });
});

describe("processReport — AI suggestion attached when provider runs", () => {
  // A fake provider that returns a single cleaned card per aircraft.
  const fakeProvider: AiProvider = {
    name: "fake",
    available: true,
    async extract(input) {
      return {
        provider: "fake",
        model: "fake-1",
        ok: true,
        message: "ok",
        usedTokens: 10,
        defects: [
          {
            registration: input.registration,
            category: input.category,
            woNumber: "999",
            defectIdRaw: null,
            shortTitle: "AI cleaned",
            fullDescription: "AI cleaned description",
            currentDueDate: null,
            isConcession: false,
            melReference: null,
            melCategory: null,
            limits: [],
          },
        ],
      };
    },
  };

  it("keeps parser fidelity and adds the AI suggestion + token tally", async () => {
    const out = await processReport({
      items: B.items,
      pageCount: B.pageCount,
      provider: fakeProvider,
    });
    expect(out.aiUsed).toBe(true);
    expect(out.aiProvider).toBe("fake");
    expect(out.totalTokens).toBe(out.aircraft.length * 10);
    for (const ac of out.aircraft) {
      expect(ac.parserDefects.length).toBeGreaterThan(0); // untouched
      expect(ac.aiDefects).not.toBeNull();
      expect(ac.aiDefects![0].shortTitle).toBe("AI cleaned");
      expect(ac.aiOk).toBe(true);
    }
  });

  it("falls back to parser-only when AI reports failure", async () => {
    const failing: AiProvider = {
      name: "failing",
      available: true,
      async extract() {
        return {
          provider: "failing",
          model: null,
          ok: false,
          message: "Gemini trả lỗi HTTP 429.",
          defects: [],
        };
      },
    };
    const out = await processReport({
      items: B.items,
      pageCount: B.pageCount,
      provider: failing,
    });
    expect(out.aiUsed).toBe(false);
    for (const ac of out.aircraft) {
      expect(ac.aiDefects).toBeNull();
      expect(ac.aiMessage).toContain("429");
    }
  });
});
