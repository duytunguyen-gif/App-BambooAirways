/** Report-to-report diff producing history events (spec §14). Identity is
 *  `category + registration + WO`, falling back to `category + registration +
 *  normalized defect ID` when WO is absent. A defect missing from the new
 *  report is REMOVED_FROM_LATEST_REPORT — never silently "closed". */
import type { Defect } from "../model";

export type HistoryEventType =
  | "NEW"
  | "UPDATED"
  | "UNCHANGED"
  | "REMOVED_FROM_LATEST_REPORT";

export interface HistoryEvent {
  eventType: HistoryEventType;
  category: Defect["category"];
  registration: string;
  defectKey: string;
  changedFields: string[];
}

export function defectIdentity(d: Pick<Defect, "category" | "registration" | "woNumber" | "defectIdNormalized">): string {
  const base = `${d.category}|${d.registration}`;
  if (d.woNumber) return `${base}|WO:${d.woNumber}`;
  if (d.defectIdNormalized) return `${base}|ID:${d.defectIdNormalized}`;
  return `${base}|?`;
}

const COMPARED_FIELDS: (keyof Defect)[] = [
  "shortTitle",
  "fullDescription",
  "currentDueDate",
  "originalDueDate",
  "concessionDueDate",
  "isConcession",
  "melReference",
  "melCategory",
  "issueStation",
  "issuedDate",
];

function changedFields(prev: Defect, next: Defect): string[] {
  const out: string[] = [];
  for (const f of COMPARED_FIELDS) {
    if (JSON.stringify(prev[f]) !== JSON.stringify(next[f])) out.push(f);
  }
  if (JSON.stringify(prev.limits) !== JSON.stringify(next.limits)) out.push("limits");
  return out;
}

export function diffReports(previous: Defect[], next: Defect[]): HistoryEvent[] {
  const prevByKey = new Map(previous.map((d) => [defectIdentity(d), d]));
  const nextByKey = new Map(next.map((d) => [defectIdentity(d), d]));
  const events: HistoryEvent[] = [];

  for (const d of next) {
    const key = defectIdentity(d);
    const prev = prevByKey.get(key);
    if (!prev) {
      events.push({ eventType: "NEW", category: d.category, registration: d.registration, defectKey: key, changedFields: [] });
    } else {
      const changed = changedFields(prev, d);
      events.push({
        eventType: changed.length ? "UPDATED" : "UNCHANGED",
        category: d.category,
        registration: d.registration,
        defectKey: key,
        changedFields: changed,
      });
    }
  }

  for (const d of previous) {
    const key = defectIdentity(d);
    if (!nextByKey.has(key)) {
      events.push({
        eventType: "REMOVED_FROM_LATEST_REPORT",
        category: d.category,
        registration: d.registration,
        defectKey: key,
        changedFields: [],
      });
    }
  }

  return events;
}
