/** One ATA chapter: search within, sort, badges, and the fault item list.
 *  Also links to the chapter's "All Circuit Breakers" page. */
import { useMemo, useState } from "react";
import type { ResetFaultItem } from "../types";
import { searchItems, sortItems, type SortKey } from "../search";
import { EmptyBox, ScreenHeader } from "../components/ui";
import { FaultItemCard } from "../components/Cards";
import { SearchBar } from "../components/SearchControls";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "az", label: "A–Z" },
  { key: "mostCb", label: "Nhiều CB" },
];

export default function ChapterDetail({
  ata,
  title,
  items,
  onBack,
  onOpenItem,
  onOpenBreakers,
}: {
  ata: string;
  title: string;
  items: ResetFaultItem[];
  onBack: () => void;
  onOpenItem: (id: string) => void;
  onOpenBreakers: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("az");

  const shown = useMemo(
    () => sortItems(searchItems(items, query), sort),
    [items, query, sort]
  );

  // The aggregate CB table only has content when items carry text CB rows.
  const hasTextCb = items.some((i) => i.circuitBreakersToReset.length > 0);

  return (
    <div>
      <ScreenHeader title={`ATA ${ata} — ${title}`} subtitle={`${items.length} mục`} onBack={onBack} />

      {hasTextCb && (
        <button
          type="button"
          onClick={onOpenBreakers}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-line-soft bg-ink-800 px-4 py-3 text-sm font-semibold text-gray-200 hover:border-bamboo-green/60"
        >
          <span>Tất cả Circuit Breakers (ATA {ata})</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}

      <div className="mb-3 space-y-2">
        <SearchBar value={query} onChange={setQuery} placeholder={`Tìm trong ATA ${ata}…`} />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                sort === s.key
                  ? "border-bamboo-green bg-bamboo-green/15 text-accent-green"
                  : "border-line-soft bg-ink-800 text-gray-400 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyBox
          message={
            items.length === 0
              ? "Chưa có dữ liệu cho chương ATA này."
              : "Không tìm thấy mục phù hợp."
          }
        />
      ) : (
        <div className="space-y-2">
          {shown.map((it) => (
            <FaultItemCard key={it.id} item={it} onClick={() => onOpenItem(it.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
