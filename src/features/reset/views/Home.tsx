/** Module home: header + disclaimer + big search + quick filters, then either
 *  a global result list (when searching/filtering) or the ATA chapter grid with
 *  recently-viewed & bookmarked shortcuts. */
import { useMemo, useState } from "react";
import type { AtaChapterMeta, ResetFaultItem } from "../types";
import { searchItems, sortItems } from "../search";
import { Disclaimer, EmptyBox } from "../components/ui";
import { AtaChapterCard, FaultItemCard } from "../components/Cards";
import {
  QuickFilters,
  SearchBar,
  type QuickFilterState,
} from "../components/SearchControls";

export default function Home({
  chapters,
  items,
  bookmarks,
  recentIds,
  onOpenChapter,
  onOpenItem,
  onOpenAdmin,
}: {
  chapters: AtaChapterMeta[];
  items: ResetFaultItem[];
  bookmarks: Set<string>;
  recentIds: string[];
  onOpenChapter: (ata: string) => void;
  onOpenItem: (id: string) => void;
  onOpenAdmin: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<QuickFilterState>({});

  const isSearching =
    query.trim().length > 0 ||
    !!filters.verifiedStatus ||
    !!filters.hasCb ||
    !!filters.favorite;

  const results = useMemo(() => {
    if (!isSearching) return [];
    return sortItems(
      searchItems(items, query, {
        verifiedStatus: filters.verifiedStatus,
        hasCb: filters.hasCb,
        favoriteIds: filters.favorite ? bookmarks : undefined,
      }),
      "az"
    );
  }, [isSearching, items, query, filters, bookmarks]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const recent = recentIds.map((id) => byId.get(id)).filter(Boolean) as ResetFaultItem[];
  const bookmarked = items.filter((i) => bookmarks.has(i.id));
  const totalItems = items.length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">A320 Reset Quick Guide</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          ECAM Reset + · Tra cứu nhanh reset lỗi theo ATA · {totalItems} mục dữ liệu
        </p>
      </div>

      <Disclaimer />

      <div className="space-y-2">
        <SearchBar value={query} onChange={setQuery} />
        <QuickFilters state={filters} onChange={setFilters} />
      </div>

      {isSearching ? (
        <section className="space-y-2">
          <p className="text-xs text-gray-500">{results.length} kết quả</p>
          {results.length === 0 ? (
            <EmptyBox message="Không tìm thấy mục phù hợp." />
          ) : (
            results.map((it) => (
              <FaultItemCard key={it.id} item={it} onClick={() => onOpenItem(it.id)} />
            ))
          )}
        </section>
      ) : (
        <>
          {recent.length > 0 && (
            <Shortcut title="Xem gần đây" items={recent.slice(0, 5)} onOpenItem={onOpenItem} />
          )}
          {bookmarked.length > 0 && (
            <Shortcut title="★ Đã đánh dấu" items={bookmarked.slice(0, 5)} onOpenItem={onOpenItem} />
          )}

          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
              ATA Chapters
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {chapters.map((c) => (
                <AtaChapterCard
                  key={c.ataNumber}
                  meta={c}
                  onClick={() => onOpenChapter(c.ataNumber)}
                />
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line-soft bg-ink-800 py-3 text-sm font-semibold text-gray-300 hover:border-bamboo-green/60 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            Quản lý dữ liệu (Admin)
          </button>
        </>
      )}
    </div>
  );
}

function Shortcut({
  title,
  items,
  onOpenItem,
}: {
  title: string;
  items: ResetFaultItem[];
  onOpenItem: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((it) => (
          <FaultItemCard key={it.id} item={it} onClick={() => onOpenItem(it.id)} />
        ))}
      </div>
    </section>
  );
}
