/** Parser data model — the deterministic output of reading an AMOS
 *  "ADD B/C DEFECT LIST" PDF. Kept free of any pdfjs / DOM types so the core
 *  parsing logic is pure and unit-testable from plain text-item fixtures. */

export type DefectCategory = "B" | "C";

/** A single positioned text run extracted from one PDF page. */
export interface RawTextItem {
  /** 1-based page number. */
  page: number;
  /** Text content (already whitespace-trimmed by the extractor is fine). */
  str: string;
  /** Left x coordinate in PDF user-space (rounded). */
  x: number;
  /** Baseline y coordinate in PDF user-space (rounded). Larger = higher. */
  y: number;
}

export type LimitType =
  | "calendar"
  | "day"
  | "fh"
  | "fc"
  | "asap"
  | "next_shop_visit"
  | "condition"
  | "na"
  | "unknown";

export interface ParsedLimit {
  limitType: LimitType;
  remainingText: string | null;
  remainingNumeric: number | null;
  dueDate: string | null; // ISO yyyy-mm-dd
  thresholdText: string | null;
  rawText: string;
  sortOrder: number;
}

export interface ParsedDefect {
  category: DefectCategory;
  registration: string;
  defectKey: string; // stable grouping key within a report
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
  currentDueDate: string | null; // ISO (DUE DATE column, effective)
  originalDueDate: string | null; // ISO
  concessionDueDate: string | null; // ISO
  isConcession: boolean;
  rawDeclaredDeadline: string | null;
  limits: ParsedLimit[];
  sourcePageStart: number;
  sourcePageEnd: number;
  sourceText: string;
  reviewRequired: boolean;
  warnings: ParserWarning[];
}

export interface ParsedAircraft {
  registration: string;
  expectedOpenCount: number | null;
  parsedOpenCount: number;
  defects: ParsedDefect[];
  sourcePageStart: number;
  sourcePageEnd: number;
  warningCount: number;
}

export type ParserWarningCode =
  | "DUE_DATE_MISMATCH"
  | "COUNT_MISMATCH"
  | "MISSING_DUE_DATE"
  | "MISSING_DEFECT_ID"
  | "AMBIGUOUS_DEADLINE"
  | "NO_LIMITS";

export interface ParserWarning {
  code: ParserWarningCode;
  message: string; // Vietnamese, user-facing
  registration?: string;
  defectKey?: string;
}

export interface ParsedReport {
  category: DefectCategory;
  /** Raw header strings, e.g. "16.Jul.2026" and "22:21". */
  reportGeneratedAtRaw: string | null;
  /** ISO 8601 timestamp (Asia/Ho_Chi_Minh wall clock, no tz suffix). */
  reportGeneratedAt: string | null;
  pageCount: number;
  parserVersion: string;
  aircraft: ParsedAircraft[];
  warnings: ParserWarning[];
  totalExpected: number | null;
  totalParsed: number;
}
