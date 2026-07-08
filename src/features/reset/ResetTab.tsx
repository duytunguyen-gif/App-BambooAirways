/** ECAM Reset+ tab root. Loads the reset catalogue + all items once, merges the
 *  local admin overlay, and drives the in-app screen stack (home → chapter →
 *  item / breakers / admin). Bookmarks & recently-viewed persist per device. */
import { useEffect, useMemo, useState } from "react";
import { loadAllItems, loadIndex } from "./data";
import type { ResetFaultItem, ResetIndex } from "./types";
import type { Nav } from "./nav";
import { computeChapters } from "./meta";
import {
  applyOverlay,
  addCorrection,
  loadBookmarks,
  loadOverlay,
  loadRecent,
  pushRecent,
  recentOrderMap,
  saveOverlay,
  toggleBookmark,
  type OverlayState,
} from "./storage";
import { ErrorBox, Spinner } from "./components/ui";
import Home from "./views/Home";
import ChapterDetail from "./views/ChapterDetail";
import FaultDetail from "./views/FaultDetail";
import AllBreakers from "./views/AllBreakers";
import Admin from "./views/Admin";

export default function ResetTab() {
  const [index, setIndex] = useState<ResetIndex | null>(null);
  const [baseItems, setBaseItems] = useState<ResetFaultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [overlay, setOverlay] = useState<OverlayState>(() => loadOverlay());
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => new Set(Object.keys(loadBookmarks())));
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecent());

  const [stack, setStack] = useState<Nav[]>([{ view: "home" }]);
  const current = stack[stack.length - 1];

  useEffect(() => {
    let alive = true;
    Promise.all([loadIndex(), loadAllItems()])
      .then(([idx, items]) => {
        if (!alive) return;
        setIndex(idx);
        setBaseItems(items);
      })
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  // Merge repo items with local overlay edits for all browse screens.
  const items = useMemo(
    () => (baseItems ? applyOverlay(baseItems, overlay) : []),
    [baseItems, overlay]
  );
  const chapters = useMemo(
    () => (index ? computeChapters(index.chapters, items) : []),
    [index, items]
  );
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  if (error) return <ErrorBox message={error} />;
  if (!index || !baseItems) return <Spinner label="Đang tải dữ liệu reset…" />;

  const go = (nav: Nav) => setStack((s) => [...s, nav]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  const openItem = (id: string) => {
    setRecentIds(pushRecent(id));
    go({ view: "item", id });
  };

  const onOverlayChange = (o: OverlayState) => {
    setOverlay(o);
    saveOverlay(o);
  };

  const onToggleBookmark = (id: string) => {
    const map = toggleBookmark(id);
    setBookmarks(new Set(Object.keys(map)));
  };

  switch (current.view) {
    case "chapter": {
      const meta = chapters.find((c) => c.ataNumber === current.ata);
      return (
        <ChapterDetail
          ata={current.ata}
          title={meta?.ataTitle ?? ""}
          items={items.filter((i) => i.ataChapter === current.ata)}
          recentOrder={recentOrderMap()}
          onBack={back}
          onOpenItem={openItem}
          onOpenBreakers={() => go({ view: "breakers", ata: current.ata })}
        />
      );
    }
    case "breakers": {
      const meta = chapters.find((c) => c.ataNumber === current.ata);
      return (
        <AllBreakers
          ata={current.ata}
          title={meta?.ataTitle ?? ""}
          items={items.filter((i) => i.ataChapter === current.ata)}
          onBack={back}
          onOpenItem={openItem}
        />
      );
    }
    case "item": {
      const item = itemsById.get(current.id);
      if (!item) {
        return <ErrorBox message="Không tìm thấy mục dữ liệu (có thể đã bị xóa)." />;
      }
      return (
        <FaultDetail
          item={item}
          bookmarked={bookmarks.has(item.id)}
          onToggleBookmark={() => onToggleBookmark(item.id)}
          onBack={back}
          onAddCorrection={(message) =>
            addCorrection({ itemId: item.id, faultTitle: item.faultTitle, message })
          }
        />
      );
    }
    case "admin":
      return (
        <Admin
          baseItems={baseItems}
          baseChapters={index.chapters}
          overlay={overlay}
          onOverlayChange={onOverlayChange}
          onBack={back}
        />
      );
    case "home":
    default:
      return (
        <Home
          chapters={chapters}
          items={items}
          bookmarks={bookmarks}
          recentIds={recentIds}
          onOpenChapter={(ata) => go({ view: "chapter", ata })}
          onOpenItem={openItem}
          onOpenAdmin={() => go({ view: "admin" })}
        />
      );
  }
}
