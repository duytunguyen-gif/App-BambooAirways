/** Maps deterministic parser output (`ParsedReport`) into the app-facing view
 *  model (`Defect` + `AircraftSummary`) the viewer components consume. The two
 *  shapes are intentionally close; this drops parser-only bookkeeping (warnings,
 *  sourceText, reviewRequired) and synthesises stable ids + the cross-category
 *  aircraft roll-up. */
import type { AircraftSummary, Defect, DefectLimit } from "../model";
import type {
  ParsedDefect,
  ParsedLimit,
  ParsedReport,
} from "../parser/types";
import { defectDueInfo, nearestDue } from "../logic/severity";
import { sortRegistrations } from "../logic/sortSearch";

function mapLimit(l: ParsedLimit): DefectLimit {
  return {
    limitType: l.limitType,
    remainingText: l.remainingText,
    remainingNumeric: l.remainingNumeric,
    dueDate: l.dueDate,
    thresholdText: l.thresholdText,
    rawText: l.rawText,
  };
}

/** Deterministic, human-readable id stable across re-parses of the same report:
 *  category + registration + (WO | normalized id | defectKey). */
function defectId(d: ParsedDefect): string {
  const tail = d.woNumber
    ? `WO${d.woNumber}`
    : d.defectIdNormalized
      ? `ID${d.defectIdNormalized}`
      : d.defectKey;
  return `${d.category}-${d.registration}-${tail}`;
}

export function mapDefect(d: ParsedDefect): Defect {
  return {
    id: defectId(d),
    category: d.category,
    registration: d.registration,
    defectKey: d.defectKey,
    woNumber: d.woNumber,
    defectIdRaw: d.defectIdRaw,
    defectIdNormalized: d.defectIdNormalized,
    shortTitle: d.shortTitle,
    fullDescription: d.fullDescription,
    issuedDate: d.issuedDate,
    issueStation: d.issueStation,
    docReference: d.docReference,
    melReference: d.melReference,
    melCategory: d.melCategory,
    currentDueDate: d.currentDueDate,
    originalDueDate: d.originalDueDate,
    concessionDueDate: d.concessionDueDate,
    isConcession: d.isConcession,
    rawDeclaredDeadline: d.rawDeclaredDeadline,
    limits: d.limits.map(mapLimit),
    sourcePageStart: d.sourcePageStart,
    sourcePageEnd: d.sourcePageEnd,
  };
}

/** All defects of a report as view-model rows (flattened across aircraft). */
export function reportToDefects(report: ParsedReport): Defect[] {
  return report.aircraft.flatMap((ac) => ac.defects.map(mapDefect));
}

/** Build the merged, numeric-sorted aircraft roll-up from the published B and C
 *  defect sets. Aircraft appearing in either category are included; an aircraft
 *  with zero defects in a category simply has a zero count there. */
export function buildAircraftSummaries(
  bDefects: Defect[],
  cDefects: Defect[],
  todayISO?: string
): AircraftSummary[] {
  const regs = sortRegistrations(
    Array.from(new Set([...bDefects, ...cDefects].map((d) => d.registration)))
  );
  const byReg = (list: Defect[], reg: string) =>
    list.filter((d) => d.registration === reg);

  return regs.map((reg) => {
    const b = byReg(bDefects, reg);
    const c = byReg(cDefects, reg);
    const all = [...b, ...c];
    const nearest = nearestDue(all, todayISO);
    return {
      registration: reg,
      bCount: b.length,
      cCount: c.length,
      nearestDueISO: nearest?.info.dueISO ?? null,
      nearestDueSeverity: nearest
        ? defectDueInfo(nearest.defect, todayISO).severity
        : "gray",
      lastDataISO: null, // filled by the snapshot layer (report timestamps)
    };
  });
}
