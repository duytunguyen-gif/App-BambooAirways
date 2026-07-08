/** Module home: header + big search, then either a global result list (when
 *  searching) or the ATA chapter list (single column, all chapters visible). */
import { useMemo, useState } from "react";
import type { AtaChapterMeta, ResetFaultItem } from "../types";
import { searchItems, sortItems } from "../search";
import { EmptyBox } from "../components/ui";
import { AtaChapterRow, FaultItemCard } from "../components/Cards";
import { SearchBar } from "../components/SearchControls";

export default function Home({
  chapters,
  items,
  onOpenChapter,
  onOpenItem,
}: {
  chapters: AtaChapterMeta[];
  items: ResetFaultItem[];
  onOpenChapter: (ata: string) => void;
  onOpenItem: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  const results = useMemo(() => {
    if (!isSearching) return [];
    return sortItems(searchItems(items, query), "az");
  }, [isSearching, items, query]);

  const totalItems = items.length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">A320 Reset Quick Guide</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          ECAM Reset + · Tra cứu nhanh reset lỗi theo ATA · {totalItems} mục dữ liệu
        </p>
      </div>

      <SearchBar value={query} onChange={setQuery} />

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
        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
            ATA Chapters
          </h3>
          <div className="space-y-1.5">
            {chapters.map((c) => (
              <AtaChapterRow
                key={c.ataNumber}
                meta={c}
                onClick={() => onOpenChapter(c.ataNumber)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
