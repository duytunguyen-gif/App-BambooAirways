/** Recompute per-chapter meta (counts) from a merged item list, keeping the
 *  title/order of the base chapter list. Pure. Shared by the home grid and the
 *  admin export so browse and export always agree. */
import type { AtaChapterMeta, ResetFaultItem } from "./types";

export function computeChapters(
  base: readonly AtaChapterMeta[],
  items: readonly ResetFaultItem[]
): AtaChapterMeta[] {
  const byAta = new Map<string, ResetFaultItem[]>();
  for (const it of items) {
    const arr = byAta.get(it.ataChapter) ?? [];
    arr.push(it);
    byAta.set(it.ataChapter, arr);
  }
  const known = new Set(base.map((c) => c.ataNumber));

  const meta = (ata: string, title: string, sortOrder: number): AtaChapterMeta => {
    const list = byAta.get(ata) ?? [];
    const verified = list.filter((i) => i.verifiedStatus === "verified").length;
    return {
      ataNumber: ata,
      ataTitle: title,
      sortOrder,
      count: list.length,
      verifiedCount: verified,
      pendingCount: list.length - verified,
    };
  };

  const result = base.map((c) =>
    ({ ...c, ...meta(c.ataNumber, c.ataTitle, c.sortOrder) })
  );
  // Items in chapters not present in the base index (rare) get appended.
  for (const [ata, list] of byAta) {
    if (known.has(ata)) continue;
    result.push(meta(ata, list[0]?.ataTitle ?? "", Number(ata) || 999));
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}
