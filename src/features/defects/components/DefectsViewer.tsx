/** Orchestrates the read-only defect browser: freshness notice → aircraft list
 *  ↔ aircraft detail. Data comes from `useDefectsData` (demo fixtures for now,
 *  Supabase published data once auth + publishing land). */
import { useState } from "react";
import { useDefectsData } from "../services/useDefectsData";
import FreshnessNotice from "./FreshnessNotice";
import AircraftList from "./AircraftList";
import AircraftDetail from "./AircraftDetail";

export default function DefectsViewer() {
  const data = useDefectsData();
  const [selectedReg, setSelectedReg] = useState<string | null>(null);

  if (data.loading) {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
        <Spinner /> Đang tải dữ liệu…
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="mt-4 rounded-xl border border-warn-red/40 bg-warn-red/10 px-3 py-3 text-sm text-red-200">
        <p className="font-semibold">Không tải được dữ liệu defects.</p>
        <p className="mt-1 text-[13px] text-red-200/80">{data.error}</p>
        <button
          type="button"
          onClick={data.reload}
          className="mt-2 rounded-lg bg-ink-700 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-ink-600"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (selectedReg) {
    const { B, C } = data.byRegistration(selectedReg);
    return (
      <AircraftDetail
        registration={selectedReg}
        defectsB={B}
        defectsC={C}
        onBack={() => setSelectedReg(null)}
      />
    );
  }

  return (
    <>
      <FreshnessNotice
        freshnessB={data.freshness.B}
        freshnessC={data.freshness.C}
        fromCache={data.snapshot?.fromCache}
      />
      <AircraftList aircraft={data.aircraft} onSelect={setSelectedReg} />
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin text-gray-500"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
