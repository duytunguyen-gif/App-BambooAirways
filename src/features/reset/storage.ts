/** Reset-guide per-device state (localStorage via the shared lib/storage).
 *  There is no user account, so bookmarks / recently-viewed / correction drafts
 *  live on the device only. Lists are wrapped in an object because the shared
 *  load() shallow-merges — see lib/storage.ts. */
import { load, remove, save } from "../../lib/storage";
import type { ResetFaultItem } from "./types";

const BOOKMARKS_KEY = "reset.bookmarks";
const RECENT_KEY = "reset.recent";
const CORRECTIONS_KEY = "reset.corrections";
const OVERLAY_KEY = "reset.overlay";

/** Map of itemId -> true for bookmarked ("hay gặp") faults. */
export type BookmarkMap = Record<string, true>;

export function loadBookmarks(): BookmarkMap {
  return load<BookmarkMap>(BOOKMARKS_KEY, {});
}

export function toggleBookmark(id: string): BookmarkMap {
  const marks = loadBookmarks();
  if (marks[id]) delete marks[id];
  else marks[id] = true;
  save(BOOKMARKS_KEY, marks);
  return marks;
}

export function isBookmarked(id: string): boolean {
  return loadBookmarks()[id] === true;
}

/** Recently-viewed item ids, newest first, capped. */
const RECENT_MAX = 30;

export function loadRecent(): string[] {
  return load<{ list: string[] }>(RECENT_KEY, { list: [] }).list;
}

export function pushRecent(id: string): string[] {
  const list = [id, ...loadRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
  save(RECENT_KEY, { list });
  return list;
}

/** id -> recency rank (0 = most recent) for sortItems("recent"). */
export function recentOrderMap(): Map<string, number> {
  const m = new Map<string, number>();
  loadRecent().forEach((id, i) => m.set(id, i));
  return m;
}

/** A locally-saved correction/suggestion. Since there is no backend, these are
 *  kept on the device and the user copies/emails them to the maintainer. */
export interface CorrectionDraft {
  id: string; // draft id (timestamp-based)
  itemId: string;
  faultTitle: string;
  message: string;
  createdAt: number;
}

export function loadCorrections(): CorrectionDraft[] {
  return load<{ list: CorrectionDraft[] }>(CORRECTIONS_KEY, { list: [] }).list;
}

export function addCorrection(
  draft: Omit<CorrectionDraft, "id" | "createdAt">
): CorrectionDraft[] {
  const entry: CorrectionDraft = {
    ...draft,
    id: `c-${Date.now()}`,
    createdAt: Date.now(),
  };
  const list = [entry, ...loadCorrections()].slice(0, 200);
  save(CORRECTIONS_KEY, { list });
  return list;
}

export function clearCorrections(): void {
  remove(CORRECTIONS_KEY);
}

// ---------------------------------------------------------------------------
// Admin overlay: local, un-committed edits layered over the repo JSON so the
// single maintainer can add/edit/delete + import, see it live while browsing,
// then Export JSON to commit into public/data/reset/. There is no backend, so
// these edits stay on this device until exported and committed.
// ---------------------------------------------------------------------------

export interface OverlayState {
  /** itemId -> full edited/added item (wins over the repo version). */
  items: Record<string, ResetFaultItem>;
  /** itemIds hidden from browse (deleted locally). */
  deleted: string[];
}

const EMPTY_OVERLAY: OverlayState = { items: {}, deleted: [] };

export function loadOverlay(): OverlayState {
  const o = load<OverlayState>(OVERLAY_KEY, EMPTY_OVERLAY);
  return { items: o.items ?? {}, deleted: o.deleted ?? [] };
}

export function saveOverlay(o: OverlayState): void {
  save(OVERLAY_KEY, o);
}

export function clearOverlay(): void {
  remove(OVERLAY_KEY);
}

export function hasOverlay(o: OverlayState): boolean {
  return Object.keys(o.items).length > 0 || o.deleted.length > 0;
}

/** Merge the repo items with the local overlay: drop deleted ids, then upsert
 *  overlay items (edits override by id; brand-new items are appended). */
export function applyOverlay(
  base: readonly ResetFaultItem[],
  overlay: OverlayState
): ResetFaultItem[] {
  const deleted = new Set(overlay.deleted);
  const byId = new Map<string, ResetFaultItem>();
  for (const it of base) {
    if (!deleted.has(it.id)) byId.set(it.id, it);
  }
  for (const [id, it] of Object.entries(overlay.items)) {
    if (!deleted.has(id)) byId.set(id, it);
  }
  return [...byId.values()];
}

/** Storage keys owned by the reset feature (cleared on "Reset all data"). */
export const RESET_STORAGE_KEYS = [
  BOOKMARKS_KEY,
  RECENT_KEY,
  CORRECTIONS_KEY,
  OVERLAY_KEY,
];
