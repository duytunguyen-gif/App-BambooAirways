/** Lịch sử điểm — các lần thi thử đã nộp (lưu localStorage). */
import { useState } from "react";
import {
  clearExamHistory,
  loadExamHistory,
  type ExamHistoryEntry,
} from "../storage";
import { EmptyBox, ScreenHeader } from "../components/ui";

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function HistoryView({ onBack }: { onBack: () => void }) {
  const [list, setList] = useState<ExamHistoryEntry[]>(() => loadExamHistory());

  return (
    <div>
      <ScreenHeader
        title="Lịch sử điểm"
        subtitle={`${list.length} lần thi thử`}
        onBack={onBack}
      />

      {list.length === 0 ? (
        <EmptyBox message="Chưa có lần thi thử nào. Hãy vào Thi Thử Như Thật." />
      ) : (
        <>
          <div className="space-y-2">
            {list.map((h) => (
              <div
                key={h.examId}
                className="flex items-center justify-between rounded-xl border border-line-soft bg-ink-800 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-white">CAT {h.cat}</div>
                  <div className="text-xs text-gray-400">{fmtDate(h.date)}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Đúng {h.correct}/{h.total}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {h.scorePercent}%
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      h.passed ? "text-accent-green" : "text-accent-red"
                    }`}
                  >
                    {h.passed ? "PASS" : "TRƯỢT"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (!confirm("Xoá toàn bộ lịch sử điểm?")) return;
              clearExamHistory();
              setList([]);
            }}
            className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-gray-300"
          >
            Xoá lịch sử
          </button>
        </>
      )}
    </div>
  );
}
