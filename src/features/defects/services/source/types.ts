/** The read-side contract the viewer UI depends on. Concrete implementations:
 *  - `demoSource` (fixtures parsed in-browser — lets the UI render before any
 *    Supabase project exists),
 *  - `supabaseSource` (published rows, added in a later phase),
 *  each optionally wrapped by an IndexedDB offline cache.
 *
 *  The UI never talks to Supabase directly; it only knows this interface, so the
 *  same aircraft list / detail / cards preview a freshly-parsed draft, live
 *  published data, or a cached snapshot with no code changes. */
import type { AircraftSummary, Defect } from "../../model";
import type { DefectCategory } from "../../parser/types";

/** One published category (B or C) as the viewer sees it. */
export interface CategorySnapshot {
  category: DefectCategory;
  /** Report timestamp from the PDF header (wall-clock ISO, no tz suffix). */
  reportGeneratedAt: string | null;
  defects: Defect[];
}

/** The current published state across both categories. Either category may be
 *  null when no report has been published for it yet. */
export interface DefectsSnapshot {
  B: CategorySnapshot | null;
  C: CategorySnapshot | null;
  /** When this snapshot was obtained by the client (for the cache banner). */
  fetchedAt: string;
  /** True when served from the offline cache rather than the network. */
  fromCache?: boolean;
}

export interface DefectsSource {
  /** A short identifier for diagnostics ("demo", "supabase", "cache"). */
  readonly name: string;
  getSnapshot(): Promise<DefectsSnapshot>;
}

/** Aircraft roll-up derived from a snapshot (numeric-sorted, both categories
 *  merged). Kept here so the list view and detail view agree on the shape. */
export type { AircraftSummary };
