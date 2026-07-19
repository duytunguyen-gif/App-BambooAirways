import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { processReport } from "../process/processReport";
import { createNoneProvider } from "../ai/noneProvider";
import { buildDraftPlan } from "./draftRows";
import type { AiProvider } from "../ai/types";
import type { RawTextItem } from "../../parser/types";

function loadFixture(name: string): { items: RawTextItem[]; pageCount: number } {
  const p = resolve(__dirname, "../../parser/__fixtures__", `${name}.items.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}
const B = loadFixture("b");
const RID = "00000000-0000-0000-0000-000000000001";

describe("buildDraftPlan — parser-sourced (none provider)", () => {
  it("maps every parser card to a record + limits with report_id stamped", async () => {
    const processed = await processReport({
      items: B.items,
      pageCount: B.pageCount,
      provider: createNoneProvider(),
    });
    const plan = buildDraftPlan(processed, RID);

    expect(plan.aircraft.length).toBe(processed.report.aircraft.length);
    expect(plan.reportPatch.ai_provider).toBe("none");
    expect(plan.reportPatch.parser_version).toBe(processed.report.parserVersion);

    for (const ac of plan.aircraft) {
      expect(ac.source).toBe("parser");
      expect(ac.row.report_id).toBe(RID);
      for (const d of ac.defects) {
        expect(d.record.report_id).toBe(RID);
        expect(d.record.registration).toBe(ac.row.registration);
        expect(typeof d.record.short_title).toBe("string");
        expect(d.record.full_description.length).toBeGreaterThan(0);
      }
    }

    // Total records == total parser cards
    const totalRecords = plan.aircraft.reduce((n, a) => n + a.defects.length, 0);
    const totalCards = processed.report.aircraft.reduce((n, a) => n + a.defects.length, 0);
    expect(totalRecords).toBe(totalCards);
  });
});

describe("buildDraftPlan — AI-sourced with parser backfill", () => {
  // Fake AI returns ONE clean card reusing a real WO so backfill can match.
  const fake: AiProvider = {
    name: "fake",
    available: true,
    async extract(input) {
      const wo = input.draft[0]?.woNumber ?? null;
      return {
        provider: "fake",
        model: "fake-1",
        ok: true,
        message: "ok",
        usedTokens: 5,
        defects: [
          {
            registration: input.registration,
            category: input.category,
            woNumber: wo,
            defectIdRaw: null,
            shortTitle: "AI cleaned title",
            fullDescription: "AI cleaned full description",
            currentDueDate: "2026-08-01",
            isConcession: false,
            melReference: null,
            melCategory: null,
            limits: [{ limitType: "day", remainingText: "10 Day", dueDate: "2026-08-01" }],
          },
        ],
      };
    },
  };

  it("uses AI text but backfills deterministic fields from the matched parser card", async () => {
    const processed = await processReport({
      items: B.items,
      pageCount: B.pageCount,
      provider: fake,
    });
    const plan = buildDraftPlan(processed, RID);

    const ac = plan.aircraft[0];
    expect(ac.source).toBe("ai");
    const rec = ac.defects[0].record;
    expect(rec.short_title).toBe("AI cleaned title");
    expect(rec.full_description).toBe("AI cleaned full description");
    expect(rec.current_due_date).toBe("2026-08-01");
    expect(rec.review_required).toBe(true); // AI always reviewed
    // defect_key reused from the matched parser card (stable across reports)
    const parserAc = processed.report.aircraft.find((a) => a.registration === ac.row.registration)!;
    const matched = parserAc.defects.find((d) => d.woNumber === rec.wo_number);
    if (matched) {
      expect(rec.defect_key).toBe(matched.defectKey);
      expect(rec.issued_date).toBe(matched.issuedDate); // backfilled
    }

    // AI-sourced report is review_required overall
    expect(plan.reportPatch.status).toBe("review_required");
    expect(plan.reportPatch.ai_provider).toBe("fake");
  });
});
