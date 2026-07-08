/** A question while TAKING a mock exam: options are selectable and can be
 *  changed, but nothing is revealed until the exam is submitted. */
import type { Question } from "../types";

export default function ExamQuestionCard({
  q,
  positionLabel,
  chosen,
  onChoose,
}: {
  q: Question;
  positionLabel: string;
  chosen: string | undefined;
  onChoose: (key: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line-soft bg-ink-800 p-4">
      <div className="mb-2">
        <span className="rounded-md bg-ink-600 px-2 py-0.5 text-xs font-semibold text-gray-300">
          {positionLabel}
        </span>
      </div>
      <p className="text-[15px] font-medium leading-snug text-white">
        {q.question}
      </p>
      <ul className="mt-3 space-y-2">
        {q.options.map((o) => {
          const selected = chosen === o.key;
          return (
            <li key={o.key}>
              <button
                type="button"
                onClick={() => onChoose(o.key)}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                  selected
                    ? "border-bamboo-blue bg-bamboo-blue/20 text-white"
                    : "border-line bg-ink-700/60 text-gray-200 hover:border-bamboo-blue/60"
                }`}
              >
                <span className="font-bold">{o.key}.</span>
                <span className="min-w-0 flex-1">{o.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
