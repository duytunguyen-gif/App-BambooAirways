import { describe, it, expect } from "vitest";
import { buildPublishPlan, type RecordForDiff } from "./publishPlan";
import { recordToDefect, type DefectRecordDbRow } from "./recordToDefect";

const P = "00000000-0000-0000-0000-0000000000p0";
const N = "00000000-0000-0000-0000-0000000000n0";

function rec(over: Partial<DefectRecordDbRow> & { id: string }): DefectRecordDbRow {
  return {
    category: "B",
    registration: "VN-A596",
    defect_key: "B|VN-A596|WO1041976",
    wo_number: "1041976",
    defect_id_raw: null,
    defect_id_normalized: null,
    short_title: "Title",
    full_description: "Full description",
    issued_date: "2026-06-01",
    issue_station: "SGN",
    doc_reference: null,
    mel_reference: null,
    mel_category: null,
    current_due_date: "2026-08-01",
    original_due_date: null,
    concession_due_date: null,
    is_concession: false,
    raw_declared_deadline: null,
    source_page_start: 1,
    source_page_end: 1,
    ...over,
  };
}

function forDiff(r: DefectRecordDbRow): RecordForDiff {
  return { recordId: r.id, defectKey: r.defect_key, defect: recordToDefect(r, []) };
}

describe("buildPublishPlan", () => {
  it("first publish (no previous) marks every record NEW", () => {
    const next = [rec({ id: "n1", wo_number: "1041976" }), rec({ id: "n2", wo_number: "1042240" })].map(forDiff);
    const plan = buildPublishPlan({ previousReportId: null, newReportId: N, previous: [], next });

    expect(plan.counts).toEqual({ new: 2, updated: 0, unchanged: 0, removed: 0 });
    for (const row of plan.historyRows) {
      expect(row.event_type).toBe("NEW");
      expect(row.previous_record_id).toBeNull();
      expect(row.new_record_id).not.toBeNull();
      expect(row.previous_report_id).toBeNull();
      expect(row.new_report_id).toBe(N);
    }
  });

  it("classifies NEW / UPDATED / UNCHANGED / REMOVED across two reports and links record ids", () => {
    // previous: WO A (will be unchanged), WO B (will change due date), WO C (removed)
    const prev = [
      rec({ id: "p_a", wo_number: "A", current_due_date: "2026-08-01" }),
      rec({ id: "p_b", wo_number: "B", current_due_date: "2026-08-10" }),
      rec({ id: "p_c", wo_number: "C" }),
    ].map(forDiff);
    // next: WO A (same), WO B (due date changed), WO D (new)
    const next = [
      rec({ id: "n_a", wo_number: "A", current_due_date: "2026-08-01" }),
      rec({ id: "n_b", wo_number: "B", current_due_date: "2026-09-15" }),
      rec({ id: "n_d", wo_number: "D" }),
    ].map(forDiff);

    const plan = buildPublishPlan({ previousReportId: P, newReportId: N, previous: prev, next });
    expect(plan.counts).toEqual({ new: 1, updated: 1, unchanged: 1, removed: 1 });

    const byType = (t: string) => plan.historyRows.filter((r) => r.event_type === t);

    const unchanged = byType("UNCHANGED")[0];
    expect(unchanged.previous_record_id).toBe("p_a");
    expect(unchanged.new_record_id).toBe("n_a");
    expect(unchanged.changed_fields).toEqual([]);

    const updated = byType("UPDATED")[0];
    expect(updated.previous_record_id).toBe("p_b");
    expect(updated.new_record_id).toBe("n_b");
    expect(updated.changed_fields).toContain("currentDueDate");

    const created = byType("NEW")[0];
    expect(created.previous_record_id).toBeNull();
    expect(created.new_record_id).toBe("n_d");

    const removed = byType("REMOVED_FROM_LATEST_REPORT")[0];
    expect(removed.previous_record_id).toBe("p_c");
    expect(removed.new_record_id).toBeNull();
    // Both report ids describe the comparison pair on every row.
    expect(removed.previous_report_id).toBe(P);
    expect(removed.new_report_id).toBe(N);
  });
});

describe("recordToDefect", () => {
  it("maps snake_case columns + sorts limits by sort_order", () => {
    const d = recordToDefect(rec({ id: "x", is_concession: true, concession_due_date: "2026-10-01" }), [
      { limit_type: "fc", remaining_text: "20 FC", remaining_numeric: 20, due_date: null, threshold_text: null, raw_text: "20 FC", sort_order: 1 },
      { limit_type: "day", remaining_text: "10 Day", remaining_numeric: 10, due_date: "2026-08-01", threshold_text: null, raw_text: "10 Day", sort_order: 0 },
    ]);
    expect(d.registration).toBe("VN-A596");
    expect(d.isConcession).toBe(true);
    expect(d.concessionDueDate).toBe("2026-10-01");
    expect(d.limits.map((l) => l.limitType)).toEqual(["day", "fc"]); // sorted
    expect(d.id).toBe("B-VN-A596-WO1041976");
  });
});
