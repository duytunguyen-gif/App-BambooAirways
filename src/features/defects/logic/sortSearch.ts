/** Numeric aircraft ordering (spec §7B) and cross-field defect search (§7B). */
import type { Defect } from "../model";

/** Extract the trailing numeric portion of a registration (VN-A227 → 227). */
export function registrationNumber(reg: string): number {
  const m = reg.match(/(\d+)/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

/** Sort registrations by their numeric part ascending (not lexicographically):
 *  VN-A227, VN-A585, VN-A594, VN-A596, VN-A597. */
export function sortRegistrations(regs: string[]): string[] {
  return [...regs].sort(
    (a, b) => registrationNumber(a) - registrationNumber(b) || a.localeCompare(b)
  );
}

/** Sort defects by raised (Iss.Date) newest first; nulls last. */
export function sortByRaisedNewest(defects: Defect[]): Defect[] {
  return [...defects].sort((a, b) => {
    if (!a.issuedDate && !b.issuedDate) return 0;
    if (!a.issuedDate) return 1;
    if (!b.issuedDate) return -1;
    return b.issuedDate.localeCompare(a.issuedDate);
  });
}

/** Case-insensitive match across registration / defect ID / WO / MEL / short
 *  title / full description. */
export function defectMatches(d: Defect, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    d.registration,
    d.defectIdRaw,
    d.defectIdNormalized,
    d.woNumber,
    d.melReference,
    d.docReference,
    d.shortTitle,
    d.fullDescription,
  ]
    .filter(Boolean)
    .join("  ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterDefects(defects: Defect[], query: string): Defect[] {
  const q = query.trim();
  if (!q) return defects;
  return defects.filter((d) => defectMatches(d, q));
}
