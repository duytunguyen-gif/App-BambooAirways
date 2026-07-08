/** Pure helpers shared by Test Bank and Mock Exam (kept framework-free so they
 *  can be unit-tested with vitest). */
import type { ExamConfig, Question } from "./types";

/** Fisher–Yates shuffle. Returns a new array; `rng` is injectable for tests. */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Only questions with a single, highlight-derived correct answer may be used
 *  for testing / exams. Everything ambiguous is excluded. */
export function isValid(q: Question): boolean {
  return q.parseStatus === "ok" && q.correctAnswer != null;
}

export function validOnly(questions: readonly Question[]): Question[] {
  return questions.filter(isValid);
}

// ---------------------------------------------------------------------------
// Mock exam generation & grading
// ---------------------------------------------------------------------------

export interface ExamPools {
  law: readonly Question[]; // Aviation Legislation
  typeEngine: readonly Question[]; // airframe + engine banks for the CRS
}

export interface ExamOptions {
  /** questionId -> how many times it has already appeared in past exams */
  seen?: Record<string, number>;
  rng?: () => number;
}

/** Pick `count` questions preferring the least-seen ones, with random
 *  tie-breaking. This makes the app work through the whole bank before it
 *  starts repeating questions. (Array.sort is stable, so the random shuffle
 *  order is preserved among questions with the same seen-count.) */
export function pickLeastSeen(
  pool: readonly Question[],
  count: number,
  seen: Record<string, number>,
  rng: () => number = Math.random
): Question[] {
  const ranked = shuffle(pool, rng).map((q) => ({ q, c: seen[q.id] ?? 0 }));
  ranked.sort((a, b) => a.c - b.c);
  return ranked.slice(0, count).map((x) => x.q);
}

/** Build one mock exam: `config.lawQuestions` from the LAW pool and
 *  `config.typeEngineQuestions` from the Type/Engine pool, no duplicates,
 *  combined and shuffled. Only valid (highlight-answered) questions are used.
 *  Least-seen questions are preferred (see `opts.seen`) so coverage rotates
 *  through the whole bank. Throws if a pool lacks enough valid questions. */
export function generateMockExam(
  pools: ExamPools,
  config: ExamConfig,
  opts: ExamOptions = {}
): Question[] {
  const rng = opts.rng ?? Math.random;
  const seen = opts.seen ?? {};
  const law = validOnly(pools.law);
  const type = validOnly(pools.typeEngine);

  if (law.length < config.lawQuestions) {
    throw new Error(
      `Không đủ câu LAW: cần ${config.lawQuestions}, chỉ có ${law.length} câu hợp lệ.`
    );
  }
  if (type.length < config.typeEngineQuestions) {
    throw new Error(
      `Không đủ câu Type/Engine: cần ${config.typeEngineQuestions}, chỉ có ${type.length} câu hợp lệ.`
    );
  }

  const picked = [
    ...pickLeastSeen(law, config.lawQuestions, seen, rng),
    ...pickLeastSeen(type, config.typeEngineQuestions, seen, rng),
  ];
  return shuffle(picked, rng);
}

export interface ExamDetail {
  id: string;
  chosen: string | null;
  correct: string | null;
  isRight: boolean;
}

export interface ExamResult {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  scorePercent: number; // 0..100, rounded to 1 decimal
  passed: boolean;
  details: ExamDetail[];
}

/** Grade an exam. Unanswered questions count as wrong for the score. */
export function gradeExam(
  questions: readonly Question[],
  answers: Readonly<Record<string, string>>,
  passPercent: number
): ExamResult {
  const details: ExamDetail[] = questions.map((q) => {
    const chosen = answers[q.id] ?? null;
    return {
      id: q.id,
      chosen,
      correct: q.correctAnswer,
      isRight: chosen != null && chosen === q.correctAnswer,
    };
  });
  const correct = details.filter((d) => d.isRight).length;
  const unanswered = details.filter((d) => d.chosen == null).length;
  const total = questions.length;
  const scorePercent = total
    ? Math.round((correct / total) * 1000) / 10
    : 0;
  return {
    total,
    correct,
    wrong: total - correct,
    unanswered,
    scorePercent,
    passed: scorePercent >= passPercent,
    details,
  };
}
