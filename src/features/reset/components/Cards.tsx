/** Grid/list cards for the reset guide: ATA chapter card + fault item card. */
import type { AtaChapterMeta, ResetFaultItem } from "../types";
import { VerifiedBadge } from "./ui";

export function AtaChapterCard({
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
      className="flex h-full flex-col items-start rounded-2xl border border-line-soft bg-ink-800 p-3 text-left transition-colors hover:border-bamboo-green/60"
    >
      <div className="flex w-full items-baseline justify-between gap-1">
        <span className="text-lg font-black text-white">ATA {meta.ataNumber}</span>
        <span className="text-[10px] font-semibold text-gray-500">
          {meta.count} mục
        </span>
      </div>
      <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-400">
        {meta.ataTitle}
      </span>
      {meta.count > 0 && (
        <span className="mt-2 flex flex-wrap gap-1 text-[10px]">
          {meta.verifiedCount > 0 && (
            <span className="rounded-full bg-bamboo-green/15 px-1.5 py-0.5 font-semibold text-bamboo-green">
              {meta.verifiedCount} verified
            </span>
          )}
          {meta.pendingCount > 0 && (
            <span className="rounded-full bg-warn-orange/15 px-1.5 py-0.5 font-semibold text-amber-300">
              {meta.pendingCount} pending
            </span>
          )}
        </span>
      )}
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
  const cbCount = item.circuitBreakersToReset.length;
  const shortNote =
    item.notes?.[0] ?? item.stepsToClearWarning?.[0] ?? item.system ?? "";
  const ref =
    item.applicableDeferrals?.[0] ?? item.signOffRefs?.[0] ?? undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start rounded-2xl border border-line-soft bg-ink-800 p-4 text-left transition-colors hover:border-bamboo-green/60"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="font-bold leading-snug text-white">{item.faultTitle}</span>
        <VerifiedBadge status={item.verifiedStatus} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
        <span>ATA {item.ataChapter}</span>
        {item.system && <span>· {item.system}</span>}
        {item.resetDuration && <span>· ⏱ {item.resetDuration}</span>}
        {cbCount > 0 && <span>· {cbCount} CB</span>}
      </div>
      {shortNote && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-400">
          {shortNote}
        </p>
      )}
      {ref && (
        <p className="mt-1 truncate text-[11px] font-medium text-gray-500">{ref}</p>
      )}
    </button>
  );
}
