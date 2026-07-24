/** A question in TEST BANK mode: the Key is hidden until the user picks an
 *  answer; then the choice locks and correct/wrong is revealed immediately. */
import { bankTitle } from "../data";
import type { BankMeta, Question } from "../types";

export default function TestQuestionCard({
  q,
  positionLabel,
  chosen,
  onChoose,
  meta,
}: {
  q: Question;
  positionLabel: string;
  chosen: string | undefined;
  onChoose: (key: string) => void;
  meta?: BankMeta;
}) {
  const answered = chosen != null;
  const correct = q.correctAnswer;
  const isRight = answered && chosen === correct;

  const source =
    (meta ? bankTitle(meta) : q.sourceFile) +
    (q.ataCode ? ` · ${q.ataCode}` : "");

  return (
    <div className="rounded-xl border border-line-soft bg-ink-800 p-4">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="rounded-md bg-ink-600 px-2 py-0.5 font-semibold text-gray-300">
          {positionLabel}
        </span>
        <span className="truncate text-gray-500">{source}</span>
      </div>

      <p className="text-[15px] font-medium leading-snug text-white">
        {q.question}
      </p>

      <ul className="mt-3 space-y-2">
        {q.options.map((o) => {
          let tone = "border-line bg-ink-700/60 text-gray-200";
          let icon: "check" | "cross" | null = null;
          if (answered) {
            if (o.key === correct) {
              tone = "border-bamboo-green bg-bamboo-green/15 text-white";
              icon = "check";
            } else if (o.key === chosen) {
              tone = "border-warn-red bg-warn-red/15 text-white";
              icon = "cross";
            } else {
              tone = "border-transparent bg-ink-700/40 text-gray-400";
            }
          }
          return (
            <li key={o.key}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onChoose(o.key)}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm leading-snug transition-colors ${tone} ${
                  answered ? "cursor-default" : "hover:border-bamboo-green/60"
                }`}
              >
                <span className="font-bold">{o.key}.</span>
                <span className="min-w-0 flex-1">{o.text}</span>
                {icon === "check" && <CheckIcon />}
                {icon === "cross" && <CrossIcon />}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="mt-3 text-sm">
          {isRight ? (
            <span className="font-semibold text-accent-green">✓ Chính xác!</span>
          ) : (
            <span className="font-semibold text-accent-red">
              ✗ Sai — đáp án đúng: {correct}
            </span>
          )}
          {q.ref && <div className="mt-1 text-xs text-gray-500">{q.ref}</div>}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-accent-green" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-accent-red" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
