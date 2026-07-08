/** Responsive circuit-breaker table with a per-table copy button. On narrow
 *  phones the table scrolls horizontally inside its own container so the page
 *  body never breaks layout. */
import type { CircuitBreaker } from "../types";
import { formatCircuitBreakers } from "../format";
import { CopyButton } from "./ui";

export default function CircuitBreakerTable({
  cbs,
}: {
  cbs: CircuitBreaker[];
}) {
  if (cbs.length === 0) {
    return (
      <p className="text-sm text-gray-500">Không có dữ liệu circuit breaker.</p>
    );
  }
  const hasNote = cbs.some((c) => c.note);
  return (
    <div>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
              <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Label</th>
              <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Panel</th>
              <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Number</th>
              {hasNote && (
                <th className="border-b border-line-soft px-2 py-1.5 font-semibold">Note</th>
              )}
            </tr>
          </thead>
          <tbody className="tabnums">
            {cbs.map((c, i) => (
              <tr key={i} className="align-top">
                <td className="border-b border-line-soft/60 px-2 py-2 font-semibold text-white">{c.label}</td>
                <td className="border-b border-line-soft/60 px-2 py-2 text-gray-200">{c.panel}</td>
                <td className="border-b border-line-soft/60 px-2 py-2 text-gray-200">{c.number}</td>
                {hasNote && (
                  <td className="border-b border-line-soft/60 px-2 py-2 text-gray-400">{c.note ?? ""}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <CopyButton text={formatCircuitBreakers(cbs)} label="Copy bảng CB" />
      </div>
    </div>
  );
}
