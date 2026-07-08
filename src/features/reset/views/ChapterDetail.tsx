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
  { key: "verifiedFirst", label: "Verified trước" },
  { key: "recent", label: "Gần đây" },
  { key: "mostCb", label: "Nhiều CB" },
];

export default function ChapterDetail({
  ata,
  title,
  items,
  recentOrder,
  onBack,
  onOpenItem,
  onOpenBreakers,
}: {
  ata: string;
  title: string;
  items: ResetFaultItem[];
  recentOrder: Map<string, number>;
  onBack: () => void;
  onOpenItem: (id: string) => void;
  onOpenBreakers: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("az");

  const verified = items.filter((i) => i.verifiedStatus === "verified").length;
  const pending = items.length - verified;

  const shown = useMemo(
    () => sortItems(searchItems(items, query), sort, recentOrder),
    [items, query, sort, recentOrder]
  );

  return (
    <div>
      <ScreenHeader title={`ATA ${ata} — ${title}`} subtitle={`${items.length} mục`} onBack={onBack} />

      <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-ink-700 px-2 py-0.5 font-semibold text-gray-300">{items.length} mục</span>
        {verified > 0 && (
          <span className="rounded-full bg-bamboo-green/15 px-2 py-0.5 font-semibold text-bamboo-green">{verified} verified</span>
        )}
        {pending > 0 && (
          <span className="rounded-full bg-warn-orange/15 px-2 py-0.5 font-semibold text-amber-300">{pending} pending</span>
        )}
      </div>

      {items.length > 0 && (
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
                  ? "border-bamboo-green bg-bamboo-green/15 text-bamboo-green"
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
              ? "Chưa có dữ liệu cho chương ATA này. Thêm ở màn Admin hoặc import JSON."
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
