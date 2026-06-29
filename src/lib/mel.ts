/**
 * MEL / defect interval date calculations.
 *
 * All "dates" here are calendar dates (no time-of-day). They are represented
 * as JS Date objects at local midnight whose Y/M/D fields are the intended
 * UTC calendar day. Display + day arithmetic use date-fns; overdue/within-24h
 * status compares the *end of the due UTC day* against the real UTC "now".
 *
 * Internal calculation aid only. Always verify with approved company
 * documents and procedures.
 */
import { addDays, format } from "date-fns";

export type RuleKey = "A" | "B" | "C" | "D" | "C_DEFECT";

export interface MelRule {
  key: RuleKey;
  label: string;
  /** Calendar-day interval; null for rule A (custom). */
  days: number | null;
}

export const MEL_RULES: MelRule[] = [
  { key: "A", label: "Interval A (custom)", days: null },
  { key: "B", label: "Interval B (3)", days: 3 },
  { key: "C", label: "Interval C (10)", days: 10 },
  { key: "D", label: "Interval D (120)", days: 120 },
  { key: "C_DEFECT", label: "C Defect (180)", days: 180 },
];

/** Parse a yyyy-MM-dd value (from <input type="date">) to a calendar date. */
export function parseInputDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  // Reject impossible dates (e.g. 2026-02-31 rolling over)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

/** Format a calendar date as DD/MM/YYYY. */
export function formatDate(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

/** Format a calendar date as yyyy-MM-dd for <input type="date">. */
export function toInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** The current UTC calendar day as a calendar date. */
export function todayUtc(now: Date = new Date()): Date {
  return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * Due date for a defect.
 *
 * - excludeDayOfDiscovery = true  (default): due = defect + intervalDays
 *   (the day of discovery is day 0 and is not counted).
 * - excludeDayOfDiscovery = false: due = defect + intervalDays - 1
 *   (the day of discovery counts as day 1).
 */
export function computeDueDate(
  defect: Date,
  intervalDays: number,
  excludeDayOfDiscovery: boolean
): Date {
  const offset = excludeDayOfDiscovery ? intervalDays : intervalDays - 1;
  return addDays(defect, offset);
}

export interface MelStatus {
  /** Whole hours left until end of the due UTC day (can be negative). */
  hoursRemaining: number;
  daysRemaining: number;
  overdue: boolean;
  /** Not yet overdue but expiring within the next 24 hours. */
  within24h: boolean;
}

/**
 * Status of a due date relative to "now".
 *
 * The deadline is the END of the due UTC day (i.e. next UTC midnight), so a
 * defect "due 01/07" is still valid throughout 01/07 UTC.
 */
export function melStatus(due: Date, now: Date = new Date()): MelStatus {
  // End of the due UTC day = start of the following UTC day.
  const deadlineMs = Date.UTC(
    due.getFullYear(),
    due.getMonth(),
    due.getDate() + 1
  );
  const diffMs = deadlineMs - now.getTime();
  const hoursRemaining = Math.floor(diffMs / 3_600_000);
  const daysRemaining = Math.floor(diffMs / 86_400_000);
  const overdue = diffMs <= 0;
  const within24h = !overdue && diffMs <= 86_400_000;
  return { hoursRemaining, daysRemaining, overdue, within24h };
}
