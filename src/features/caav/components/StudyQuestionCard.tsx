/** A single question in HỌC BANK (study) mode: the correct answer (Key) is
 *  shown up-front so users can learn quickly. */
import type { Question } from "../types";

export default function StudyQuestionCard({
  q,
  showKey,
  marked,
  onToggleMark,
}: {
  q: Question;
  showKey: boolean;
  marked: boolean;
  onToggleMark: () => void;
}) {
  const hasAnswer = q.parseStatus === "ok" && q.correctAnswer != null;

  return (
    <div className="rounded-xl border border-line-soft bg-ink-800 p-3.5">
      {/* header row */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-md bg-ink-600 px-2 py-0.5 text-xs font-semibold text-gray-300">
          Câu {q.questionNumberOriginal}
        </span>
        <button
          type="button"
          onClick={onToggleMark}
          aria-label={marked ? "Bỏ đánh dấu khó" : "Đánh dấu câu khó"}
          aria-pressed={marked}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            marked ? "text-yellow-400" : "text-gray-600 hover:text-gray-300"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={marked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
        </button>
      </div>

      {/* question */}
      <p className="text-[15px] font-medium leading-snug text-white">
        {q.question}
      </p>

      {/* options */}
      <ul className="mt-3 space-y-1.5">
        {q.options.map((o) => {
          const isCorrect = showKey && hasAnswer && o.key === q.correctAnswer;
          return (
            <li
              key={o.key}
              className={`flex gap-2 rounded-lg border px-3 py-2 text-sm leading-snug ${
                isCorrect
                  ? "border-bamboo-green bg-bamboo-green/15 text-white"
                  : "border-transparent bg-ink-700/60 text-gray-200"
              }`}
            >
              <span className={`font-bold ${isCorrect ? "text-bamboo-green" : "text-gray-400"}`}>
                {o.key}.
              </span>
              <span className="min-w-0 flex-1">{o.text}</span>
              {isCorrect && (
                <svg className="mt-0.5 shrink-0 text-bamboo-green" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </li>
          );
        })}
      </ul>

      {/* key / status line */}
      {showKey &&
        (hasAnswer ? (
          <div className="mt-2.5 text-sm font-semibold text-bamboo-green">
            Đáp án đúng: {q.correctAnswer}
          </div>
        ) : (
          <div className="mt-2.5 text-sm font-semibold text-warn-orange">
            Chưa xác định đáp án (cần kiểm tra tài liệu gốc)
          </div>
        ))}

      {/* ref */}
      {q.ref && (
        <div className="mt-1.5 text-xs text-gray-500">{q.ref}</div>
      )}
    </div>
  );
}
