/** Shows when each category's data was generated (spec-mandated
 *  "HH:mm / dd/MM/yyyy"). Sits directly under the always-on reference warning so
 *  the user can judge how current the numbers are. */
interface Props {
  freshnessB: string;
  freshnessC: string;
  fromCache?: boolean;
}

export default function FreshnessNotice({ freshnessB, freshnessC, fromCache }: Props) {
  return (
    <div className="mt-3 rounded-xl border border-line-soft bg-ink-800 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Dữ liệu cập nhật
        </span>
        {fromCache && (
          <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            Ngoại tuyến
          </span>
        )}
      </div>
      <dl className="mt-1.5 grid grid-cols-2 gap-2 text-[13px]">
        <div>
          <dt className="text-gray-500">ADD B</dt>
          <dd className="font-mono tabular-nums text-gray-200">{freshnessB}</dd>
        </div>
        <div>
          <dt className="text-gray-500">ADD C</dt>
          <dd className="font-mono tabular-nums text-gray-200">{freshnessC}</dd>
        </div>
      </dl>
    </div>
  );
}
