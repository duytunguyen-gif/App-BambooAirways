/** One aircraft's defects: ADD B / ADD C toggle, in-list search, nearest-due
 *  ordering, tap-through to the detail sheet. Back returns to the aircraft list. */
import { useMemo, useState } from "react";
import type { Defect } from "../model";
import { filterDefects } from "../logic/sortSearch";
import { nearestDue } from "../logic/severity";
import DefectCard from "./DefectCard";
import DefectDetailSheet from "./DefectDetailSheet";

interface Props {
  registration: string;
  defectsB: Defect[];
  defectsC: Defect[];
  onBack: () => void;
}

/** Nearest-due ordering: repeatedly pick the most-urgent remaining defect. */
function sortByNearestDue(defects: Defect[]): Defect[] {
  const pool = [...defects];
  const out: Defect[] = [];
  while (pool.length) {
    const pick = nearestDue(pool);
    if (!pick) break;
    const idx = pool.indexOf(pick.defect);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export default function AircraftDetail({
  registration,
  defectsB,
  defectsC,
  onBack,
}: Props) {
  const [cat, setCat] = useState<"B" | "C">(defectsB.length ? "B" : "C");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Defect | null>(null);

  const source = cat === "B" ? defectsB : defectsC;
  const list = useMemo(
    () => sortByNearestDue(filterDefects(source, query)),
    [source, query]
  );

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex min-h-[40px] items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Danh sách tàu bay
      </button>

      <h2 className="text-lg font-bold tracking-wide text-white">{registration}</h2>

      {/* Category toggle */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <CatButton
          active={cat === "B"}
          onClick={() => setCat("B")}
          label="ADD B"
          count={defectsB.length}
        />
        <CatButton
          active={cat === "C"}
          onClick={() => setCat("C")}
          label="ADD C"
          count={defectsC.length}
        />
      </div>

      {/* Search */}
      <div className="mt-3">
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm WO, MEL, mô tả…"
          className="w-full rounded-xl border border-line bg-ink-700 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-teal-accent focus:outline-none"
        />
      </div>

      {/* List */}
      {list.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          {query ? "Không tìm thấy defect phù hợp." : "Không có defect trong nhóm này."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((d) => (
            <li key={d.id}>
              <DefectCard defect={d} onSelect={setSelected} />
            </li>
          ))}
        </ul>
      )}

      <DefectDetailSheet defect={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function CatButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-teal-accent bg-teal-accent/10 text-white"
          : "border-line-soft bg-ink-800 text-gray-400 hover:text-white"
      }`}
    >
      {label}
      <span
        className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
          active ? "bg-teal-accent/20 text-teal-accent" : "bg-ink-700 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
