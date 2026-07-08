/** List cards for the reset guide: compact ATA chapter row + fault item card. */
import type { AtaChapterMeta, ResetFaultItem } from "../types";

/** Compact one-line chapter row so every ATA chapter fits in a single column. */
export function AtaChapterRow({
  meta,
  onClick,
}: {
  meta: AtaChapterMeta;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line-soft bg-ink-800 px-3 py-2.5 text-left transition-colors hover:border-bamboo-green/60"
    >
      <span className="w-14 shrink-0 text-base font-black text-white">
        {meta.ataNumber}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-gray-300">
        {meta.ataTitle}
      </span>
      <span className="shrink-0 text-[11px] font-semibold text-gray-500">
        {meta.count} mục
      </span>
      <svg className="shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  );
}

export function FaultItemCard({
  item,
  onClick,
}: {
  item: ResetFaultItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl border border-line-soft bg-ink-800 px-3 py-2.5 text-left transition-colors hover:border-bamboo-green/60"
    >
      <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-white">
        {item.faultTitle}
      </span>
      <svg className="shrink-0 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  );
}
