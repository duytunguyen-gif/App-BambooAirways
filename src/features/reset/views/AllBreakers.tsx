/** All circuit breakers in one ATA chapter — a flat, searchable table joining
 *  every fault item's CB rows, each linking back to its fault detail. */
import { useMemo, useState } from "react";
import type { ResetFaultItem } from "../types";
import { EmptyBox, ScreenHeader } from "../components/ui";
import { SearchBar } from "../components/SearchControls";

interface Row {
  faultId: string;
  faultTitle: string;
  label: string;
  panel: string;
  number: string;
  note?: string;
}

export default function AllBreakers({
  ata,
  title,
  items,
  onBack,
  onOpenItem,
}: {
  ata: string;
  title: string;
  items: ResetFaultItem[];
  onBack: () => void;
  onOpenItem: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo<Row[]>(
    () =>
      items.flatMap((it) =>
        it.circuitBreakersToReset.map((cb) => ({
          faultId: it.id,
          faultTitle: it.faultTitle,
          label: cb.label,
          panel: cb.panel,
          number: cb.number,
          note: cb.note,
        }))
      ),
    [items]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.label} ${r.panel} ${r.number} ${r.faultTitle} ${r.note ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  return (
    <div>
      <ScreenHeader
        title={`Circuit Breakers — ATA ${ata}`}
        subtitle={`${title} · ${rows.length} CB`}
        onBack={onBack}
      />

      <div className="mb-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Tìm CB: label, panel, number, fault…"
        />
      </div>

      {shown.length === 0 ? (
        <EmptyBox message={rows.length === 0 ? "Chương này chưa có dữ liệu CB." : "Không có CB phù hợp."} />
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[340px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Label</th>
                <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Panel</th>
                <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Number</th>
                <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Fault</th>
              </tr>
            </thead>
            <tbody className="tabnums">
              {shown.map((r, i) => (
                <tr key={i} className="align-top">
                  <td className="border-b border-line-soft/60 px-2 py-2 font-semibold text-white">{r.label}</td>
                  <td className="border-b border-line-soft/60 px-2 py-2 text-gray-200">{r.panel}</td>
                  <td className="border-b border-line-soft/60 px-2 py-2 text-gray-200">
                    {r.number}
                    {r.note && <span className="block text-[11px] text-gray-500">{r.note}</span>}
                  </td>
                  <td className="border-b border-line-soft/60 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenItem(r.faultId)}
                      className="text-left text-xs font-medium text-bamboo-green underline decoration-dotted underline-offset-2"
                    >
                      {r.faultTitle}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
