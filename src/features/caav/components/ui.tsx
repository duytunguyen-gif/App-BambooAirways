/** Small shared UI atoms for the CAAV feature (dark theme, matches the app). */
import type { Crs } from "../types";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-bamboo-green" />
      {label && <div className="text-sm">{label}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-warn-red/50 bg-warn-red/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}

export function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-line-soft bg-ink-800 px-4 py-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

/** Back header shown at the top of every non-dashboard screen. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-soft text-gray-300 hover:bg-ink-700 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

const CRS_LIST: Crs[] = ["A", "B1", "B2"];

/** Three CRS selector pills. */
export function CrsPills({
  value,
  onChange,
}: {
  value: Crs | null;
  onChange: (c: Crs) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CRS_LIST.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`min-h-[52px] rounded-xl border text-base font-bold transition-colors ${
              active
                ? "border-bamboo-green bg-sel text-white"
                : "border-line bg-ink-800 text-gray-300 hover:border-line hover:text-white"
            }`}
          >
            CRS {c}
          </button>
        );
      })}
    </div>
  );
}
