/** Search input + quick-filter chips used on Home and the chapter/CB screens. */
import type { VerifiedStatus } from "../types";

export function SearchBar({
  value,
  onChange,
  placeholder = "Tìm fault, ATA, CB, panel, AMM, MEL, keyword…",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        inputMode="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min16 w-full rounded-xl border border-line bg-ink-700 py-3 pl-10 pr-9 text-base text-white placeholder:text-gray-500 focus:border-bamboo-green focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Xóa tìm kiếm"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      )}
    </div>
  );
}

export interface QuickFilterState {
  verifiedStatus?: VerifiedStatus;
  hasCb?: boolean;
  favorite?: boolean;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-bamboo-green bg-bamboo-green/15 text-bamboo-green"
          : "border-line-soft bg-ink-800 text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function QuickFilters({
  state,
  onChange,
}: {
  state: QuickFilterState;
  onChange: (s: QuickFilterState) => void;
}) {
  const toggleStatus = (s: VerifiedStatus) =>
    onChange({ ...state, verifiedStatus: state.verifiedStatus === s ? undefined : s });
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <Chip active={state.verifiedStatus === "verified"} onClick={() => toggleStatus("verified")}>
        Verified
      </Chip>
      <Chip active={state.verifiedStatus === "pending"} onClick={() => toggleStatus("pending")}>
        Pending
      </Chip>
      <Chip active={!!state.hasCb} onClick={() => onChange({ ...state, hasCb: !state.hasCb })}>
        Có CB
      </Chip>
      <Chip active={!!state.favorite} onClick={() => onChange({ ...state, favorite: !state.favorite })}>
        ★ Favorite
      </Chip>
    </div>
  );
}
