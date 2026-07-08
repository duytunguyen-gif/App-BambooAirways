/** Responsive circuit-breaker view. When the source lists CBs as one or more
 *  images (panels / MCDU / schematic) we show the originals verbatim, framed
 *  with a rounded green border to match the source chart. Text CB rows fall
 *  back to a scrollable table. */
import type { CircuitBreaker } from "../types";
import { formatCircuitBreakers } from "../format";
import { CopyButton } from "./ui";

function CbImage({ src }: { src: string }) {
  const url = `${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`;
  return (
    <img
      src={url}
      alt="Circuit breakers (from source chart)"
      className="w-full max-w-sm rounded-xl border-2 border-bamboo-green/70 bg-white"
    />
  );
}

export default function CircuitBreakerTable({
  cbs,
  cbImage,
  cbImages,
  cbText,
}: {
  cbs: CircuitBreaker[];
  cbImage?: string;
  cbImages?: string[];
  cbText?: string;
}) {
  // Collect every source image (single legacy field + newer array), de-duped.
  const images = [...(cbImages ?? []), ...(cbImage ? [cbImage] : [])].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  if (cbs.length === 0 && images.length > 0) {
    return (
      <div className="space-y-3">
        {images.map((src) => (
          <CbImage key={src} src={src} />
        ))}
      </div>
    );
  }
  // Source stated the breakers as words (e.g. "None.", "N34"), not a chart.
  if (cbs.length === 0 && cbText) {
    const isNone = /^none\.?$/i.test(cbText.trim());
    return isNone ? (
      <p className="text-sm text-gray-400">
        Không có circuit breaker cần reset.{" "}
        <span className="text-gray-500">(nguồn ghi: “None”)</span>
      </p>
    ) : (
      <p className="text-sm font-semibold text-white">{cbText}</p>
    );
  }
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
