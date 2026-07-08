/** CAAV-specific persisted state (localStorage via the shared lib/storage).
 *  Kept as plain objects (maps) so the shallow-merge in load() behaves. */
import { load, remove, save } from "../../lib/storage";
import type { Crs } from "./types";

const MARKS_KEY = "caav.marks";
const TEST_KEY = "caav.testProgress";
const HISTORY_KEY = "caav.examHistory";
const SEEN_KEY = "caav.examSeen";

/** Map of questionId -> true for questions the user flagged as "khó". */
export type MarkMap = Record<string, true>;

export function loadMarks(): MarkMap {
  return load<MarkMap>(MARKS_KEY, {});
}

export function saveMarks(marks: MarkMap): void {
  save(MARKS_KEY, marks);
}

/** A resumable Test Bank session. */
export interface TestProgress {
  scopeId: string; // e.g. "A::all" or "A::a320-a"
  scopeLabel: string;
  crs: Crs;
  slugs: string[]; // banks that make up the scope
  order: string[]; // shuffled question ids (current working set)
  answers: Record<string, string>; // questionId -> chosen option key
  createdAt: number;
  /** The full question set + label the session started with. "Test lại câu sai"
   *  narrows `order`; "Làm lại từ đầu" restores these so the user always returns
   *  to the whole original test. Optional for backward-compat with old saves. */
  baseOrder?: string[];
  baseLabel?: string;
}

export function loadTestProgress(): TestProgress | null {
  const p = load<{ v: TestProgress | null }>(TEST_KEY, { v: null });
  return p.v;
}

export function saveTestProgress(progress: TestProgress): void {
  save(TEST_KEY, { v: progress });
}

export function clearTestProgress(): void {
  remove(TEST_KEY);
}

/** One completed mock-exam result kept in the score history. */
export interface ExamHistoryEntry {
  examId: string;
  date: number;
  cat: Crs;
  total: number;
  correct: number;
  scorePercent: number;
  passed: boolean;
}

export function loadExamHistory(): ExamHistoryEntry[] {
  return load<{ list: ExamHistoryEntry[] }>(HISTORY_KEY, { list: [] }).list;
}

/** Prepend a result (newest first), keeping at most 100 entries. */
export function addExamHistory(entry: ExamHistoryEntry): ExamHistoryEntry[] {
  const list = [entry, ...loadExamHistory()].slice(0, 100);
  save(HISTORY_KEY, { list });
  return list;
}

export function clearExamHistory(): void {
  remove(HISTORY_KEY);
}

/** questionId -> number of times it has appeared in generated mock exams.
 *  Used to prefer least-seen questions so exams rotate through the whole bank. */
export type SeenMap = Record<string, number>;

export function loadExamSeen(): SeenMap {
  return load<SeenMap>(SEEN_KEY, {});
}

/** Increment the seen-count for each question in a freshly generated exam. */
export function bumpExamSeen(ids: string[]): void {
  const seen = loadExamSeen();
  for (const id of ids) seen[id] = (seen[id] ?? 0) + 1;
  save(SEEN_KEY, seen);
}

/** Storage keys owned by the CAAV feature (cleared on "Reset all data"). */
export const CAAV_STORAGE_KEYS = [
  MARKS_KEY,
  TEST_KEY,
  HISTORY_KEY,
  SEEN_KEY,
];
