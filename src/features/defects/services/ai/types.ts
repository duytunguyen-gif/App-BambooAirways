/** AI provider layer for the A/C Defects pipeline.
 *
 *  The deterministic parser (parser/parseDefects.ts) is always the first pass:
 *  it is free, offline and private. An AI provider is an OPTIONAL cleanup step
 *  the uploader can invoke when the AMOS PDF layout defeats the coordinate-band
 *  heuristics (e.g. the defect statement drifts between columns, or several ADD
 *  ids get merged into one card). The provider takes one aircraft's raw text
 *  plus the deterministic draft and returns cleaned, well-separated defects.
 *
 *  Privacy contract (see memory: defects-ai-decision): only the PAID / no-train
 *  endpoint is allowed; the key is server-side only and never bundled into the
 *  client. `AI_PROVIDER=none` keeps the whole feature parser-only. */
import type { DefectCategory } from "../../parser/types";

/** A single limit as understood by the AI (kept close to ParsedLimit, but the
 *  AI only needs the human-facing shape — numeric normalisation stays in the
 *  deterministic layer). */
export interface AiLimit {
  /** "day" | "fh" | "fc" | "calendar" | "condition" | "asap" | "unknown". */
  limitType: string;
  /** Verbatim remaining text, e.g. "61 Day", "2579:19 FH", "188 FC". */
  remainingText: string | null;
  /** ISO yyyy-mm-dd if a concrete due date applies to this limit, else null. */
  dueDate: string | null;
}

/** One cleaned defect card as returned by the AI. Field names intentionally
 *  mirror ParsedDefect so mapping back is trivial. */
export interface AiDefect {
  registration: string;
  category: DefectCategory;
  woNumber: string | null;
  defectIdRaw: string | null;
  shortTitle: string;
  fullDescription: string;
  currentDueDate: string | null; // ISO yyyy-mm-dd
  isConcession: boolean;
  melReference: string | null;
  melCategory: string | null;
  limits: AiLimit[];
}

export interface AiExtractInput {
  registration: string;
  category: DefectCategory;
  /** Header "Open Defects = N" (row count) for reconciliation, if known. */
  expectedOpenCount: number | null;
  /** Deterministic reading-order text for this aircraft (the AI's source). */
  rawText: string;
  /** Deterministic draft cards, given to the AI as a hint (may be wrong). */
  draft: AiDefect[];
}

export interface AiExtractResult {
  provider: string;
  model: string | null;
  /** false when the provider is not configured or the call failed. */
  ok: boolean;
  /** Vietnamese, user-facing status. */
  message: string;
  defects: AiDefect[];
  /** Total tokens billed, when the provider reports it. */
  usedTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  /** Whether this provider can actually run (configured with a usable key). */
  readonly available: boolean;
  extract(input: AiExtractInput): Promise<AiExtractResult>;
}

/** Minimal fetch signature so providers stay unit-testable with a mock. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
