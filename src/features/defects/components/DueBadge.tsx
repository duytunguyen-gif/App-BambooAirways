/** Compact due-status pill driven by a defect's effective due info. Colour comes
 *  from severity; the text prefers a concrete days-left / due-date, falling back
 *  to the severity label for non-calendar limits (FH/FC/next shop visit). */
import type { Defect } from "../model";
import { defectDueInfo } from "../logic/severity";
import { formatDueDate } from "../utils/dates";
import { SEVERITY_STYLE } from "./severityStyle";

export function dueBadgeText(d: Defect): string {
  const info = defectDueInfo(d);
  if (info.isAsap) return "ASAP";
  if (info.daysLeft != null) {
    if (info.daysLeft < 0) return `Quá hạn ${Math.abs(info.daysLeft)} ngày`;
    if (info.daysLeft === 0) return "Hết hạn hôm nay";
    return `Còn ${info.daysLeft} ngày`;
  }
  // Non-calendar limit: surface the shortest remaining FH/FC figure if present.
  const fhfc = d.limits.find(
    (l) => l.limitType === "fh" || l.limitType === "fc"
  );
  if (fhfc?.remainingText) return `Còn ${fhfc.remainingText}`;
  return SEVERITY_STYLE[info.severity].label;
}

export default function DueBadge({ defect }: { defect: Defect }) {
  const info = defectDueInfo(defect);
  const style = SEVERITY_STYLE[info.severity];
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${style.badge}`}
      title={info.dueISO ? formatDueDate(info.dueISO) : undefined}
    >
      {dueBadgeText(defect)}
    </span>
  );
}
