/** ECAM Reset+ tab root. Loads the reset catalogue + all items once and drives
 *  the in-app screen stack (home → chapter → item / breakers). Read-only quick
 *  reference — no bookmarks, recents, or admin editing. */
import { useEffect, useMemo, useState } from "react";
import { loadAllItems, loadIndex } from "./data";
import type { ResetFaultItem, ResetIndex } from "./types";
import type { Nav } from "./nav";
import { computeChapters } from "./meta";
import { ErrorBox, Spinner } from "./components/ui";
import Home from "./views/Home";
import ChapterDetail from "./views/ChapterDetail";
import FaultDetail from "./views/FaultDetail";
import AllBreakers from "./views/AllBreakers";

export default function ResetTab() {
  const [index, setIndex] = useState<ResetIndex | null>(null);
  const [items, setItems] = useState<ResetFaultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stack, setStack] = useState<Nav[]>([{ view: "home" }]);
  const current = stack[stack.length - 1];

  useEffect(() => {
    let alive = true;
    Promise.all([loadIndex(), loadAllItems()])
      .then(([idx, list]) => {
        if (!alive) return;
        setIndex(idx);
        setItems(list);
      })
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  const chapters = useMemo(
    () => (index && items ? computeChapters(index.chapters, items) : []),
    [index, items]
  );
  const itemsById = useMemo(
    () => new Map((items ?? []).map((i) => [i.id, i])),
    [items]
  );

  if (error) return <ErrorBox message={error} />;
  if (!index || !items) return <Spinner label="Đang tải dữ liệu reset…" />;

  const go = (nav: Nav) => setStack((s) => [...s, nav]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const openItem = (id: string) => go({ view: "item", id });

  switch (current.view) {
    case "chapter": {
      const meta = chapters.find((c) => c.ataNumber === current.ata);
      return (
        <ChapterDetail
          ata={current.ata}
          title={meta?.ataTitle ?? ""}
          items={items.filter((i) => i.ataChapter === current.ata)}
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
      return <FaultDetail item={item} onBack={back} />;
    }
    case "home":
    default:
      return (
        <Home
          chapters={chapters}
          items={items}
          onOpenChapter={(ata) => go({ view: "chapter", ata })}
          onOpenItem={openItem}
        />
      );
  }
}
