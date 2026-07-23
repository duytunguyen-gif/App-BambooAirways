/** Pure planning for publishing a processed report (spec §14). Given the stored
 *  records of the report being published ("next") and those of the current
 *  published report of the same category ("previous"), it produces the exact
 *  `defect_history_events` insert rows by reusing `diffReports`. No Supabase here
 *  so it is fully unit-testable; the /api/defects/publish handler does the
 *  transactional writes (supersede previous, mark this current, insert events).
 *
 *  Identity matching is `diffReports`' `category|registration|WO` (fallback
 *  normalized id), so the same defect across two reports links its previous and
 *  new record ids into one history event. */
import type { Defect } from "../../model.js";
import { diffReports, defectIdentity, type HistoryEventType } from "../../logic/history.js";

export interface RecordForDiff {
  /** DB `defect_records.id`. */
  recordId: string;
  /** DB `defect_records.defect_key` (stored on the event for reference). */
  defectKey: string;
  defect: Defect;
}

export interface HistoryEventRow {
  category: "B" | "C";
  registration: string;
  defect_key: string;
  previous_report_id: string | null;
  new_report_id: string | null;
  previous_record_id: string | null;
  new_record_id: string | null;
  event_type: HistoryEventType;
  changed_fields: string[];
}

export interface PublishPlan {
  historyRows: HistoryEventRow[];
  counts: { new: number; updated: number; unchanged: number; removed: number };
}

export function buildPublishPlan(args: {
  previousReportId: string | null;
  newReportId: string;
  previous: RecordForDiff[];
  next: RecordForDiff[];
}): PublishPlan {
  const { previousReportId, newReportId, previous, next } = args;

  const prevByIdentity = new Map(previous.map((r) => [defectIdentity(r.defect), r]));
  const nextByIdentity = new Map(next.map((r) => [defectIdentity(r.defect), r]));

  const events = diffReports(
    previous.map((r) => r.defect),
    next.map((r) => r.defect)
  );

  const counts = { new: 0, updated: 0, unchanged: 0, removed: 0 };
  const historyRows: HistoryEventRow[] = events.map((e) => {
    const prev = prevByIdentity.get(e.defectKey);
    const nx = nextByIdentity.get(e.defectKey);

    switch (e.eventType) {
      case "NEW":
        counts.new++;
        break;
      case "UPDATED":
        counts.updated++;
        break;
      case "UNCHANGED":
        counts.unchanged++;
        break;
      case "REMOVED_FROM_LATEST_REPORT":
        counts.removed++;
        break;
    }

    // Every event is a comparison between the previous and new report, so both
    // report ids describe the pair; presence in each report is carried by the
    // (nullable) record ids — null previous_record_id ⇒ NEW, null new_record_id
    // ⇒ REMOVED_FROM_LATEST_REPORT.
    return {
      category: e.category,
      registration: e.registration,
      // Prefer the record's stored defect_key; fall back to the identity string.
      defect_key: nx?.defectKey ?? prev?.defectKey ?? e.defectKey,
      previous_report_id: previousReportId,
      new_report_id: newReportId,
      previous_record_id: prev?.recordId ?? null,
      new_record_id: nx?.recordId ?? null,
      event_type: e.eventType,
      changed_fields: e.changedFields,
    };
  });

  return { historyRows, counts };
}
