/** Pure mapping: a persisted `defect_records` row (+ its `defect_limits`) back
 *  into the app-facing `Defect` view model. This is the inverse of the draft
 *  writer — it lets the publish step diff two stored reports with the same
 *  `diffReports` logic the viewer uses, and lets the viewer render straight from
 *  the DB. Column names are snake_case (Postgres); the view model is camelCase. */
import type { Defect, DefectLimit } from "../../model";
import type { LimitType } from "../../parser/types";

/** Shape of a `defect_records` row as selected from Supabase. */
export interface DefectRecordDbRow {
  id: string;
  category: "B" | "C";
  registration: string;
  defect_key: string;
  wo_number: string | null;
  defect_id_raw: string | null;
  defect_id_normalized: string | null;
  short_title: string;
  full_description: string;
  issued_date: string | null;
  issue_station: string | null;
  doc_reference: string | null;
  mel_reference: string | null;
  mel_category: string | null;
  current_due_date: string | null;
  original_due_date: string | null;
  concession_due_date: string | null;
  is_concession: boolean;
  raw_declared_deadline: string | null;
  source_page_start: number | null;
  source_page_end: number | null;
}

/** Shape of a `defect_limits` row as selected from Supabase. */
export interface DefectLimitDbRow {
  limit_type: string;
  remaining_text: string | null;
  remaining_numeric: number | null;
  due_date: string | null;
  threshold_text: string | null;
  raw_text: string | null;
  sort_order: number;
}

function mapLimit(l: DefectLimitDbRow): DefectLimit {
  return {
    limitType: l.limit_type as LimitType,
    remainingText: l.remaining_text,
    remainingNumeric: l.remaining_numeric,
    dueDate: l.due_date,
    thresholdText: l.threshold_text,
    rawText: l.raw_text ?? "",
  };
}

/** Deterministic, human-readable id stable across reports (mirrors mapper.ts):
 *  category + registration + (WO | normalized id | defectKey). */
function defectId(r: DefectRecordDbRow): string {
  const tail = r.wo_number
    ? `WO${r.wo_number}`
    : r.defect_id_normalized
      ? `ID${r.defect_id_normalized}`
      : r.defect_key;
  return `${r.category}-${r.registration}-${tail}`;
}

export function recordToDefect(r: DefectRecordDbRow, limits: DefectLimitDbRow[]): Defect {
  const ordered = [...limits].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: defectId(r),
    category: r.category,
    registration: r.registration,
    defectKey: r.defect_key,
    woNumber: r.wo_number,
    defectIdRaw: r.defect_id_raw,
    defectIdNormalized: r.defect_id_normalized,
    shortTitle: r.short_title,
    fullDescription: r.full_description,
    issuedDate: r.issued_date,
    issueStation: r.issue_station,
    docReference: r.doc_reference,
    melReference: r.mel_reference,
    melCategory: r.mel_category,
    currentDueDate: r.current_due_date,
    originalDueDate: r.original_due_date,
    concessionDueDate: r.concession_due_date,
    isConcession: r.is_concession,
    rawDeclaredDeadline: r.raw_declared_deadline,
    limits: ordered.map(mapLimit),
    sourcePageStart: r.source_page_start,
    sourcePageEnd: r.source_page_end,
  };
}
