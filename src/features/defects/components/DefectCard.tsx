/** One defect as a tappable card. Left border + due badge encode severity;
 *  a purple pill marks a concession (spec §7E). Fills are never used. */
import type { Defect } from "../model";
import { defectDueInfo } from "../logic/severity";
import { formatDueDate } from "../utils/dates";
import { CONCESSION_BADGE, SEVERITY_STYLE } from "./severityStyle";
import DueBadge from "./DueBadge";

interface Props {
  defect: Defect;
  onSelect: (defect: Defect) => void;
}

export default function DefectCard({ defect, onSelect }: Props) {
  const info = defectDueInfo(defect);
  const style = SEVERITY_STYLE[info.severity];
  return (
    <button
      type="button"
      onClick={() => onSelect(defect)}
      className={`w-full rounded-xl border border-line-soft border-l-4 ${style.border} bg-ink-800 px-3 py-2.5 text-left transition-colors hover:border-line`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {defect.shortTitle || defect.fullDescription || "(Không có mô tả)"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">
            {[defect.woNumber && `WO ${defect.woNumber}`, defect.melReference]
              .filter(Boolean)
              .join("  ·  ") || "—"}
          </p>
        </div>
        <DueBadge defect={defect} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {defect.isConcession && (
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${CONCESSION_BADGE}`}
          >
            Concession
          </span>
        )}
        {defect.melCategory && (
          <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            CAT {defect.melCategory}
          </span>
        )}
        {defect.currentDueDate && (
          <span className="text-[11px] text-gray-500">
            Due {formatDueDate(defect.currentDueDate)}
          </span>
        )}
      </div>
    </button>
  );
}
