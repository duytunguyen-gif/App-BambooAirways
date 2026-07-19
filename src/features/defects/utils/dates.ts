/** Date helpers for the Defects module. All calculations are date-only in the
 *  Asia/Ho_Chi_Minh timezone (the operational timezone), independent of the
 *  viewer's device timezone. No external tz library is required because Vietnam
 *  has a fixed +07:00 offset with no DST. */

export const APP_TZ_OFFSET_MIN = 7 * 60; // Asia/Ho_Chi_Minh, fixed +07:00

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Parse an AMOS "DD.Mon.YYYY" token → ISO "yyyy-mm-dd" (null if invalid). */
export function parseAmosDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\.([A-Za-z]{3})\.(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = MONTHS[m[2].toLowerCase()];
  const year = Number(m[3]);
  if (!mon || day < 1 || day > 31) return null;
  return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a compact declared deadline like "19JULY2026", "21/07/2026",
 *  "15.08.2026", "29SEP2026" → ISO. Conservative: returns null when unsure. */
export function parseDeclaredDeadline(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  // dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy
  let m = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (m) {
    const d = Number(m[1]); const mo = Number(m[2]); const y = Number(m[3]);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  // ddMONyyyy e.g. 19JULY2026 / 29SEP2026
  m = s.match(/\b(\d{1,2})\s?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s?(\d{4})\b/);
  if (m) {
    const d = Number(m[1]); const mo = MONTHS[m[2].toLowerCase()]; const y = Number(m[3]);
    if (mo && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return null;
}

/** Today's date (yyyy-mm-dd) in Asia/Ho_Chi_Minh. */
export function todayInAppTz(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + APP_TZ_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Whole-day difference (dueISO − todayISO). Negative = overdue. */
export function daysUntil(dueISO: string | null, todayISO: string = todayInAppTz()): number | null {
  if (!dueISO) return null;
  const due = Date.parse(dueISO + "T00:00:00Z");
  const today = Date.parse(todayISO + "T00:00:00Z");
  if (Number.isNaN(due) || Number.isNaN(today)) return null;
  return Math.round((due - today) / 86_400_000);
}

/** Format an ISO date as "dd MMM yyyy" (e.g. "21 Jul 2026"). */
const MON_LABEL = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function formatDueDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]} ${MON_LABEL[Number(m[2]) - 1]} ${m[1]}`;
}

/** Format a report timestamp as the mandated "HH:mm / dd/MM/yyyy". Accepts an
 *  ISO datetime (wall-clock, no tz) or null. */
export function formatFreshness(isoDateTime: string | null): string {
  if (!isoDateTime) return "Chưa có dữ liệu";
  const m = isoDateTime.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return "Chưa có dữ liệu";
  return `${m[4]}:${m[5]} / ${m[3]}/${m[2]}/${m[1]}`;
}

/** Combine an AMOS date + "HH:mm" into a wall-clock ISO datetime string. */
export function combineReportTimestamp(dateRaw: string | null, timeRaw: string | null): string | null {
  const d = parseAmosDate(dateRaw);
  if (!d) return null;
  const t = (timeRaw ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  const hh = t ? String(Number(t[1])).padStart(2, "0") : "00";
  const mm = t ? t[2] : "00";
  return `${d}T${hh}:${mm}:00`;
}
