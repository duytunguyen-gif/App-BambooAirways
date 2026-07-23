/** App-facing view model for published defect data. This is the shape the
 *  frontend consumes from Supabase (or the offline cache) and is intentionally
 *  close to the parser output so a freshly-parsed draft can be previewed with
 *  the same components. */
import type { DefectCategory, LimitType } from "./parser/types.js";

export type { DefectCategory, LimitType };

export interface DefectLimit {
  limitType: LimitType;
  remainingText: string | null;
  remainingNumeric: number | null;
  dueDate: string | null; // ISO
  thresholdText: string | null;
  rawText: string;
}

export interface Defect {
  id: string;
  category: DefectCategory;
  registration: string;
  defectKey: string;
  woNumber: string | null;
  defectIdRaw: string | null;
  defectIdNormalized: string | null;
  shortTitle: string;
  fullDescription: string;
  issuedDate: string | null; // ISO
  issueStation: string | null;
  docReference: string | null;
  melReference: string | null;
  melCategory: string | null;
  currentDueDate: string | null; // ISO (effective)
  originalDueDate: string | null;
  concessionDueDate: string | null;
  isConcession: boolean;
  rawDeclaredDeadline: string | null;
  limits: DefectLimit[];
  sourcePageStart: number | null;
  sourcePageEnd: number | null;
}

/** Severity buckets driving left-border / badge / text accents (never fills).
 *  `concession` is a separate visual dimension (purple badge). */
export type Severity = "red" | "orange" | "amber" | "gray";

export interface AircraftSummary {
  registration: string;
  bCount: number;
  cCount: number;
  nearestDueISO: string | null;
  nearestDueSeverity: Severity;
  /** Latest published report timestamp among the aircraft's categories. */
  lastDataISO: string | null;
}
