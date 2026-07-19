/** Aircraft roll-up list (spec §7B): one row per registration, numeric-sorted,
 *  showing ADD B / ADD C counts and a nearest-due accent. Tapping a row opens
 *  that aircraft's defect detail. */
import type { AircraftSummary } from "../model";
import { formatDueDate } from "../utils/dates";
import { SEVERITY_STYLE } from "./severityStyle";

interface Props {
  aircraft: AircraftSummary[];
  onSelect: (registration: string) => void;
}

export default function AircraftList({ aircraft, onSelect }: Props) {
  if (aircraft.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-gray-500">
        Chưa có dữ liệu tàu bay.
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-2.5">
      {aircraft.map((ac) => (
        <li key={ac.registration}>
          <AircraftRow ac={ac} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

function AircraftRow({
  ac,
  onSelect,
}: {
  ac: AircraftSummary;
  onSelect: (registration: string) => void;
}) {
  const style = SEVERITY_STYLE[ac.nearestDueSeverity];
  return (
    <button
      type="button"
      onClick={() => onSelect(ac.registration)}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-line-soft border-l-4 ${style.border} bg-ink-800 px-4 py-3 text-left transition-colors hover:border-line`}
    >
      <div className="min-w-0">
        <div className="text-base font-bold tracking-wide text-white">
          {ac.registration}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <CountChip label="B" count={ac.bCount} />
          <CountChip label="C" count={ac.cCount} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {ac.nearestDueISO ? (
          <span className={`text-[13px] font-semibold ${style.text}`}>
            {formatDueDate(ac.nearestDueISO)}
          </span>
        ) : (
          <span className="text-[11px] text-gray-500">Không hạn lịch</span>
        )}
        <svg
          className="text-gray-600"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </button>
  );
}

function CountChip({ label, count }: { label: string; count: number }) {
  const dim = count === 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${
        dim
          ? "bg-ink-700 text-gray-500"
          : "bg-ink-700 text-gray-200 ring-1 ring-inset ring-line"
      }`}
    >
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
}
