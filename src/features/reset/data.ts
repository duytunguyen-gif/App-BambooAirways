/** Loads the reset-guide JSON data (index + per-chapter item files) with
 *  in-memory caching. Files are static assets under public/data/reset/ — no
 *  backend needed. Mirrors src/features/caav/data.ts. */
import type { ChapterFile, ResetFaultItem, ResetIndex } from "./types";

const BASE = `${import.meta.env.BASE_URL}data/reset/`;

let indexPromise: Promise<ResetIndex> | null = null;
const chapterPromises = new Map<string, Promise<ResetFaultItem[]>>();

export function loadIndex(): Promise<ResetIndex> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}index.json`).then((r) => {
      if (!r.ok) throw new Error(`Không tải được danh mục Reset (${r.status})`);
      return r.json();
    });
  }
  return indexPromise;
}

/** Load one chapter's fault items. A chapter with no data file (or an empty
 *  chapter) resolves to [] rather than throwing, so the 20-chapter structure
 *  can exist before every chapter has content. */
export function loadChapter(ataNumber: string): Promise<ResetFaultItem[]> {
  let p = chapterPromises.get(ataNumber);
  if (!p) {
    p = fetch(`${BASE}ata-${ataNumber}.json`)
      .then((r) => {
        if (r.status === 404) return { items: [] } as Partial<ChapterFile>;
        if (!r.ok) throw new Error(`Không tải được ATA ${ataNumber} (${r.status})`);
        return r.json();
      })
      .then((data: Partial<ChapterFile>) => data.items ?? []);
    chapterPromises.set(ataNumber, p);
  }
  return p;
}

/** Load every chapter that the index reports as having items, concatenated.
 *  Powers the module-home global search. Uses the per-chapter cache. */
export async function loadAllItems(): Promise<ResetFaultItem[]> {
  const index = await loadIndex();
  const withData = index.chapters.filter((c) => c.count > 0);
  const parts = await Promise.all(withData.map((c) => loadChapter(c.ataNumber)));
  return parts.flat();
}

/** Test seam — reset the in-memory caches (not used in the app itself). */
export function __clearResetCache(): void {
  indexPromise = null;
  chapterPromises.clear();
}
