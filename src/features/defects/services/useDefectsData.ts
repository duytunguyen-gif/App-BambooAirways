/** Loads a `DefectsSnapshot` and derives the merged aircraft roll-up + per-
 *  registration lookups the viewer needs. Source selection lives here so the UI
 *  is agnostic: until the Supabase published-data path is wired, this uses the
 *  in-browser demo source so the module is fully previewable. */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AircraftSummary, Defect } from "../model";
import { buildAircraftSummaries } from "./mapper";
import { demoSource } from "./source/demoSource";
import type { DefectsSnapshot, DefectsSource } from "./source/types";
import { formatFreshness } from "../utils/dates";

/** Chooses the active data source. For now the demo fixtures; the Supabase
 *  published source replaces this once auth + publishing land. */
export function getActiveSource(): DefectsSource {
  return demoSource;
}

export interface DefectsData {
  loading: boolean;
  error: string | null;
  snapshot: DefectsSnapshot | null;
  aircraft: AircraftSummary[];
  /** Defects for one registration, split by category. */
  byRegistration: (reg: string) => { B: Defect[]; C: Defect[] };
  /** Freshness lines for the notice, formatted "HH:mm / dd/MM/yyyy". */
  freshness: { B: string; C: string };
  reload: () => void;
  sourceName: string;
}

export function useDefectsData(): DefectsData {
  const source = useMemo(() => getActiveSource(), []);
  const [snapshot, setSnapshot] = useState<DefectsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    source
      .getSnapshot()
      .then((snap) => {
        if (alive) setSnapshot(snap);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [source, nonce]);

  const bDefects = snapshot?.B?.defects ?? [];
  const cDefects = snapshot?.C?.defects ?? [];

  const aircraft = useMemo(
    () => buildAircraftSummaries(bDefects, cDefects),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot]
  );

  const byRegistration = useCallback(
    (reg: string) => ({
      B: bDefects.filter((d) => d.registration === reg),
      C: cDefects.filter((d) => d.registration === reg),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot]
  );

  const freshness = useMemo(
    () => ({
      B: formatFreshness(snapshot?.B?.reportGeneratedAt ?? null),
      C: formatFreshness(snapshot?.C?.reportGeneratedAt ?? null),
    }),
    [snapshot]
  );

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    loading,
    error,
    snapshot,
    aircraft,
    byRegistration,
    freshness,
    reload,
    sourceName: source.name,
  };
}
