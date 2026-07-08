/** Pure search & filter logic for the reset guide. Framework-free so it can be
 *  unit-tested with vitest and reused by Home (global search) and the per-chapter
 *  screens. */
import type { ResetFaultItem, VerifiedStatus } from "./types";

/** Everything a query can match against, flattened to one lowercase haystack. */
function haystack(item: ResetFaultItem): string {
  const cb = item.circuitBreakersToReset
    .flatMap((c) => [c.label, c.panel, c.number, c.note ?? ""])
    .join(" ");
  return [
    item.faultTitle,
    item.ataChapter,
    item.ataTitle,
    item.system ?? "",
    cb,
    (item.signOffRefs ?? []).join(" "),
    (item.applicableDeferrals ?? []).join(" "),
    (item.tags ?? []).join(" "),
    (item.aircraftConfigurationPriorToReset ?? []).join(" "),
    (item.stepsToClearWarning ?? []).join(" "),
    (item.notes ?? []).join(" "),
  ]
    .join("  ")
    .toLowerCase();
}

/** True if the item matches every whitespace-separated term in `query`
 *  (AND semantics). Empty/whitespace query matches everything. */
export function matchesQuery(item: ResetFaultItem, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = haystack(item);
  return terms.every((t) => hay.includes(t));
}

export interface ResetFilters {
  ataNumber?: string; // exact ATA chapter, e.g. "22"
  verifiedStatus?: VerifiedStatus; // exact status
  hasCb?: boolean; // only items with at least one circuit breaker
  favoriteIds?: Set<string>; // only bookmarked items
}

export function passesFilters(item: ResetFaultItem, f: ResetFilters): boolean {
  if (f.ataNumber && item.ataChapter !== f.ataNumber) return false;
  if (f.verifiedStatus && item.verifiedStatus !== f.verifiedStatus) return false;
  if (f.hasCb && item.circuitBreakersToReset.length === 0) return false;
  if (f.favoriteIds && !f.favoriteIds.has(item.id)) return false;
  return true;
}

/** Apply query + filters. Query-matched items are returned; ordering is left
 *  to the caller (see sortItems). */
export function searchItems(
  items: readonly ResetFaultItem[],
  query: string,
  filters: ResetFilters = {}
): ResetFaultItem[] {
  return items.filter(
    (it) => passesFilters(it, filters) && matchesQuery(it, query)
  );
}

export type SortKey = "az" | "verifiedFirst" | "recent" | "mostCb";

const statusRank: Record<VerifiedStatus, number> = {
  verified: 0,
  needs_review: 1,
  pending: 2,
};

/** Non-mutating sort. `recentOrder` maps id -> recency rank (0 = most recent);
 *  ids not present sort last. */
export function sortItems(
  items: readonly ResetFaultItem[],
  key: SortKey,
  recentOrder?: Map<string, number>
): ResetFaultItem[] {
  const arr = items.slice();
  switch (key) {
    case "az":
      arr.sort((a, b) => a.faultTitle.localeCompare(b.faultTitle));
      break;
    case "verifiedFirst":
      arr.sort(
        (a, b) =>
          statusRank[a.verifiedStatus] - statusRank[b.verifiedStatus] ||
          a.faultTitle.localeCompare(b.faultTitle)
      );
      break;
    case "mostCb":
      arr.sort(
        (a, b) =>
          b.circuitBreakersToReset.length - a.circuitBreakersToReset.length ||
          a.faultTitle.localeCompare(b.faultTitle)
      );
      break;
    case "recent": {
      const rank = (id: string) =>
        recentOrder?.has(id) ? (recentOrder.get(id) as number) : Number.MAX_SAFE_INTEGER;
      arr.sort((a, b) => rank(a.id) - rank(b.id) || a.faultTitle.localeCompare(b.faultTitle));
      break;
    }
  }
  return arr;
}
