/** Shared types for the CAAV exam feature. Mirrors the JSON produced by
 *  scripts/parse_caav.py in public/data/caav/. */

export type Crs = "A" | "B1" | "B2";

export type ParseStatus =
  | "ok"
  | "missing_answer"
  | "multi_answer"
  | "missing_options"
  | "missing_question"
  | "parse_error";

export type SectionType =
  | "LAW"
  | "English"
  | "TypeEngine"
  | "Basic"
  | "Reference";

export interface QuestionOption {
  key: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface Question {
  id: string;
  crs: string; // "A" | "B1" | "B2" | "ALL"
  cat: string | null;
  aircraftType: string | null;
  engineType: string | null;
  sourceFile: string;
  sectionType: SectionType;
  ataCode: string | null;
  ataTitle: string | null;
  questionNumberOriginal: number;
  question: string;
  options: QuestionOption[];
  correctAnswer: string | null; // null when parseStatus !== "ok"
  ref: string | null;
  answerSource: string; // "yellow_highlight" | "unknown"
  parseStatus: ParseStatus;
}

export interface AtaGroup {
  code: string | null;
  title: string | null;
  count: number;
}

export interface BankMeta {
  slug: string;
  sourceFile: string;
  crs: string;
  cat: string | null;
  aircraftType: string | null;
  engineType: string | null;
  sectionType: SectionType;
  stated: number | null;
  total: number;
  okCount: number;
  missingAnswerCount: number;
  multiAnswerCount: number;
  otherIssueCount: number;
  ataGroups: AtaGroup[];
}

export interface ExamConfig {
  lawQuestions: number;
  typeEngineQuestions: number;
  totalQuestions: number;
  passPercent: number;
}

export interface CrsGroup {
  label: string;
  banks: string[]; // bank slugs
}

export interface CaavIndex {
  totalQuestions: number;
  examConfig: Record<Crs, ExamConfig>;
  crsGroups: Record<Crs, CrsGroup>;
  banks: BankMeta[];
}
