/** Due-date severity + nearest-due selection (spec §7E colour rules and §8
 *  nearest-due priority). Pure, timezone-aware via the date utils. */
import type { Defect, DefectLimit, Severity } from "../model";
import { daysUntil, todayInAppTz } from "../utils/dates";

/** Map a calendar days-left value to a severity bucket. */
export function severityForDaysLeft(daysLeft: number | null): Severity {
  if (daysLeft == null) return "gray";
  if (daysLeft < 0) return "red"; // overdue
  if (daysLeft <= 7) return "orange";
  if (daysLeft <= 30) return "amber";
  return "gray";
}

/** True if any limit is an ASAP marker (raw text or explicit type). */
function hasAsap(d: Defect): boolean {
  return d.limits.some(
    (l) => l.limitType === "asap" || /\bASAP\b/i.test(l.rawText || "")
  );
}

/** Effective calendar due for a defect: concession due overrides original. */
export function effectiveDueISO(d: Defect): string | null {
  if (d.isConcession && d.concessionDueDate) return d.concessionDueDate;
  return d.currentDueDate;
}

export interface DueInfo {
  dueISO: string | null;
  daysLeft: number | null;
  severity: Severity;
  isAsap: boolean;
}

export function defectDueInfo(d: Defect, todayISO: string = todayInAppTz()): DueInfo {
  const dueISO = effectiveDueISO(d);
  const daysLeft = daysUntil(dueISO, todayISO);
  const isAsap = hasAsap(d);
  let severity = severityForDaysLeft(daysLeft);
  if (isAsap && severity !== "red") severity = "red";
  return { dueISO, daysLeft, severity, isAsap };
}

/** Rank a defect for nearest-due selection. Lower rank sorts first. Follows the
 *  spec priority: overdue/negative → ASAP → concession-soon → earliest calendar
 *  due → FH/FC remaining → next-shop-visit/condition/NA last. */
interface Ranked {
  defect: Defect;
  info: DueInfo;
  rank: number;
  sortKey: number; // secondary numeric key (days left, or +Inf)
}

function rankDefect(d: Defect, todayISO: string): Ranked {
  const info = defectDueInfo(d, todayISO);
  const onlyNonCalendar =
    d.limits.length > 0 &&
    d.limits.every((l) =>
      (["fh", "fc", "next_shop_visit", "condition", "na", "unknown"] as DefectLimit["limitType"][]).includes(
        l.limitType
      )
    );

  let rank: number;
  if (info.daysLeft != null && info.daysLeft < 0) rank = 0; // overdue
  else if (info.isAsap) rank = 1;
  else if (d.isConcession && info.dueISO) rank = 2;
  else if (info.dueISO) rank = 3; // calendar due
  else if (d.limits.some((l) => l.limitType === "fh" || l.limitType === "fc")) rank = 4;
  else rank = 5; // next shop visit / condition / NA / unknown

  if (onlyNonCalendar && rank === 3) rank = 4;

  const sortKey =
    info.daysLeft != null
      ? info.daysLeft
      : rank === 4
        ? minRemaining(d)
        : Number.POSITIVE_INFINITY;
  return { defect: d, info, rank, sortKey };
}

function minRemaining(d: Defect): number {
  const nums = d.limits
    .filter((l) => l.limitType === "fh" || l.limitType === "fc")
    .map((l) => l.remainingNumeric)
    .filter((n): n is number => n != null);
  return nums.length ? Math.min(...nums) : Number.POSITIVE_INFINITY;
}

/** Pick the nearest-due defect across a set; returns its due info or null. */
export function nearestDue(
  defects: Defect[],
  todayISO: string = todayInAppTz()
): { defect: Defect; info: DueInfo } | null {
  if (defects.length === 0) return null;
  const ranked = defects.map((d) => rankDefect(d, todayISO));
  ranked.sort((a, b) => a.rank - b.rank || a.sortKey - b.sortKey);
  const best = ranked[0];
  return { defect: best.defect, info: best.info };
}
