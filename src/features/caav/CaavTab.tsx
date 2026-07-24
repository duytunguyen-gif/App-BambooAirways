/** CAAV Exam tab: small dashboard that routes to the 3 study/test branches
 *  plus score history. Loads the bank catalogue (index.json) once. */
import { useEffect, useState } from "react";
import { loadIndex } from "./data";
import type { CaavIndex } from "./types";
import StudyView from "./study/StudyView";
import TestView from "./test/TestView";
import ExamView from "./exam/ExamView";
import HistoryView from "./history/HistoryView";
import { ErrorBox, Spinner } from "./components/ui";

type View = "dashboard" | "study" | "test" | "exam" | "history";

export default function CaavTab() {
  const [index, setIndex] = useState<CaavIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");

  useEffect(() => {
    let alive = true;
    loadIndex()
      .then((i) => alive && setIndex(i))
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!index) return <Spinner label="Đang tải ngân hàng câu hỏi…" />;

  const back = () => setView("dashboard");
  if (view === "study") return <StudyView index={index} onBack={back} />;
  if (view === "test") return <TestView index={index} onBack={back} />;
  if (view === "exam") return <ExamView index={index} onBack={back} />;
  if (view === "history") return <HistoryView onBack={back} />;

  return <Dashboard total={index.totalQuestions} onOpen={setView} />;
}

function Dashboard({
  total,
  onOpen,
}: {
  total: number;
  onOpen: (v: View) => void;
}) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">CAAV Exam — Học thi</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Ngân hàng {total.toLocaleString("vi-VN")} câu hỏi · A320 / CFM56 / LEAP-1A / V2500 / Luật / English
        </p>
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-line-soft bg-ink-800/70 px-3 py-2 text-[11px] leading-relaxed text-gray-400">
          <svg
            className="mt-0.5 shrink-0 text-accent-teal"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Bộ bank của dòng máy bay{" "}
            <span className="font-semibold text-gray-200">A320F</span>, tải trực
            tiếp từ SharePoint{" "}
            <span className="font-semibold text-gray-200">Rev01 (05Jun25)</span>.
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <DashCard
          title="Học Bank"
          desc="Xem toàn bộ câu hỏi kèm đáp án đúng để học"
          tone="green"
          onClick={() => onOpen("study")}
        />
        <DashCard
          title="Test Bank"
          desc="Tự luyện — chọn đáp án, biết đúng/sai ngay từng câu"
          tone="blue"
          onClick={() => onOpen("test")}
        />
        <DashCard
          title="Thi Thử Như Thật"
          desc="Đề mô phỏng kỳ thi gia hạn CAAV, chấm sau khi nộp (PASS ≥ 75%)"
          tone="teal"
          onClick={() => onOpen("exam")}
        />
        <DashCard
          title="Lịch sử điểm"
          desc="Xem lại các lần thi thử đã làm"
          tone="gray"
          onClick={() => onOpen("history")}
        />
      </div>
    </div>
  );
}

function DashCard({
  title,
  desc,
  tone,
  badge,
  onClick,
}: {
  title: string;
  desc: string;
  tone: "green" | "blue" | "teal" | "gray";
  badge?: string;
  onClick: () => void;
}) {
  const ring =
    tone === "green"
      ? "hover:border-bamboo-green/70"
      : tone === "blue"
        ? "hover:border-bamboo-blue/70"
        : tone === "teal"
          ? "hover:border-teal-accent/70"
          : "hover:border-line";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-line-soft bg-ink-800 p-4 text-left transition-colors ${ring}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{title}</span>
          {badge && (
            <span className="rounded-full bg-ink-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-gray-400">{desc}</div>
      </div>
      <svg className="shrink-0 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
