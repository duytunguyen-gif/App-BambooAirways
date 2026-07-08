/** Shared types for the ECAM Reset+ feature — a quick-reference guide for
 *  A320 Family fault reset procedures, grouped by ATA chapter.
 *
 *  Source of truth = static JSON under public/data/reset/ (index + per-chapter
 *  files), mirroring the CAAV feature's data pattern. No backend / no DB.
 *
 *  SAFETY: this is an internal training/reference aid only. Nothing here
 *  replaces the approved AMM/MEL/TSM. Items that have not been checked against
 *  official documentation MUST carry verifiedStatus "pending" (or "needs_review").
 */

/** Verification state of a fault item's data. */
export type VerifiedStatus = "verified" | "pending" | "needs_review";

/** One circuit breaker row in the "Circuit breakers to reset" table. */
export interface CircuitBreaker {
  /** e.g. "FAC 1", "RUD TRIM IND." */
  label: string;
  /** e.g. "49VU", "122VU" */
  panel: string;
  /** e.g. "B3, B4" — kept as free text because sources list multiple numbers. */
  number: string;
  /** Optional extra note for this CB row. */
  note?: string;
}

/** Pass / Fail result of the power-up test or reset. */
export interface ResetResults {
  pass?: string;
  fail?: string;
}

/** A single fault / reset procedure entry. Field names follow the schema the
 *  user specified. Only faultTitle + ataChapter are strictly required. */
export interface ResetFaultItem {
  id: string; // stable slug, e.g. "auto-flt-rudder-trim-1-2-fault"
  aircraftType: string; // e.g. "A320 Family"
  ataChapter: string; // e.g. "22"
  ataTitle: string; // e.g. "Auto Flight"
  faultTitle: string; // e.g. "AUTO FLT - RUDDER TRIM 1(2) FAULT"
  system?: string; // e.g. "Rudder Trim / FAC"
  aircraftConfigurationPriorToReset: string[];
  circuitBreakersToReset: CircuitBreaker[];
  /** Path (under public/) to the original CB chart image when the source lists
   *  circuit breakers as a picture rather than text. Rendered as-is so nothing
   *  is transcribed/guessed. e.g. "data/reset/images/22/ruddertrim.gif". */
  cbImage?: string;
  /** Multiple source illustrations (panels / MCDU / schematic) for this fault,
   *  when the page carries more than one. Rendered verbatim alongside cbImage. */
  cbImages?: string[];
  /** Source's Circuit-breakers section text when it is written as words rather
   *  than a chart image (e.g. "None.", "N34", "Tripped breaker."). Shown as-is
   *  so the section reflects the source instead of looking like missing data. */
  cbText?: string;
  stepsToClearWarning: string[];
  resetDuration?: string; // e.g. "90 seconds."
  results: ResetResults;
  notes?: string[];
  signOffRefs?: string[]; // AMM references
  applicableDeferrals?: string[]; // MEL references
  warnings?: string[];
  sourceRef?: string; // where the data came from (url / doc)
  revision?: string;
  effectiveDate?: string;
  verifiedStatus: VerifiedStatus;
  verifiedBy?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Per-chapter summary shown on the module home grid. */
export interface AtaChapterMeta {
  ataNumber: string; // "22"
  ataTitle: string; // "Auto Flight"
  description?: string;
  sortOrder: number;
  count: number; // total fault items in this chapter
  verifiedCount: number;
  pendingCount: number; // pending + needs_review
}

/** public/data/reset/index.json */
export interface ResetIndex {
  aircraftType: string;
  generatedAt: string;
  totalItems: number;
  chapters: AtaChapterMeta[];
}

/** public/data/reset/ata-XX.json */
export interface ChapterFile {
  ataNumber: string;
  ataTitle: string;
  items: ResetFaultItem[];
}
