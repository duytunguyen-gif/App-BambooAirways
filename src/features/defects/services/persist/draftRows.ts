/** Pure mapping: a ProcessedReport → the exact insert payloads for the Defects
 *  schema (report_aircraft / defect_records / defect_limits) plus the patch for
 *  the parent defect_reports row. No Supabase here so it is fully unit-testable;
 *  the /api/defects/process handler inserts these rows via the service role.
 *
 *  Canonical draft = the AI-cleaned cards when the provider ran (they separate
 *  merged defects and normalise dates — see the eval), falling back to the
 *  deterministic parser cards. Deterministic-only fields the AI doesn't produce
 *  (issued date/station, doc ref, source pages, numeric remaining) are
 *  backfilled from the matching parser card by WO number when possible. Every
 *  record is a DRAFT for human review before publish. */
import type { ParsedDefect, ParsedReport } from "../../parser/types.js";
import type { AiDefect } from "../ai/types.js";
import type { ProcessedReport } from "../process/processReport.js";

export interface DefectLimitRow {
  limit_type: string;
  remaining_text: string | null;
  remaining_numeric: number | null;
  due_date: string | null;
  threshold_text: string | null;
  raw_text: string | null;
  sort_order: number;
}

export interface DefectRecordRow {
  report_id: string;
  category: "B" | "C";
  registration: string;
  defect_key: string;
  wo_number: string | null;
  defect_id_raw: string | null;
  defect_id_normalized: string | null;
  short_title: string;
  full_description: string;
  issued_date: string | null;
  issue_station: string | null;
  doc_reference: string | null;
  mel_reference: string | null;
  mel_category: string | null;
  current_due_date: string | null;
  original_due_date: string | null;
  concession_due_date: string | null;
  is_concession: boolean;
  raw_declared_deadline: string | null;
  source_page_start: number | null;
  source_page_end: number | null;
  source_text: string | null;
  raw_payload: unknown;
  review_required: boolean;
}

export interface DraftAircraft {
  row: {
    report_id: string;
    registration: string;
    expected_open_count: number | null;
    parsed_open_count: number;
    warning_count: number;
    source_page_start: number | null;
    source_page_end: number | null;
  };
  defects: Array<{ record: DefectRecordRow; limits: DefectLimitRow[] }>;
  /** How this aircraft's records were sourced (for the summary/audit). */
  source: "ai" | "parser";
}

export interface DraftPlan {
  reportPatch: {
    page_count: number;
    parser_version: string;
    ai_provider: string;
    ai_model: string | null;
    report_generated_at: string | null;
    report_generated_at_raw: string | null;
    status: "review_required" | "ready_to_publish";
    processing_summary: unknown;
    warnings: unknown;
  };
  aircraft: DraftAircraft[];
}

function limitRowsFromParser(d: ParsedDefect): DefectLimitRow[] {
  return d.limits.map((l, i) => ({
    limit_type: l.limitType,
    remaining_text: l.remainingText,
    remaining_numeric: l.remainingNumeric,
    due_date: l.dueDate,
    threshold_text: l.thresholdText,
    raw_text: l.rawText,
    sort_order: l.sortOrder ?? i,
  }));
}

function recordFromParser(reportId: string, d: ParsedDefect): {
  record: DefectRecordRow;
  limits: DefectLimitRow[];
} {
  return {
    record: {
      report_id: reportId,
      category: d.category,
      registration: d.registration,
      defect_key: d.defectKey,
      wo_number: d.woNumber,
      defect_id_raw: d.defectIdRaw,
      defect_id_normalized: d.defectIdNormalized,
      short_title: d.shortTitle,
      full_description: d.fullDescription,
      issued_date: d.issuedDate,
      issue_station: d.issueStation,
      doc_reference: d.docReference,
      mel_reference: d.melReference,
      mel_category: d.melCategory,
      current_due_date: d.currentDueDate,
      original_due_date: d.originalDueDate,
      concession_due_date: d.concessionDueDate,
      is_concession: d.isConcession,
      raw_declared_deadline: d.rawDeclaredDeadline,
      source_page_start: d.sourcePageStart,
      source_page_end: d.sourcePageEnd,
      source_text: d.sourceText,
      raw_payload: { source: "parser", defect: d },
      review_required: d.reviewRequired,
    },
    limits: limitRowsFromParser(d),
  };
}

function recordFromAi(
  reportId: string,
  a: AiDefect,
  parserByWo: Map<string, ParsedDefect>,
  index: number
): { record: DefectRecordRow; limits: DefectLimitRow[] } {
  const match = a.woNumber ? parserByWo.get(a.woNumber) : undefined;
  const defectKey =
    match?.defectKey ??
    `${a.category}|${a.registration}|${a.woNumber ?? "AI" + index}`;
  const limits: DefectLimitRow[] = a.limits.map((l, i) => {
    // Backfill numeric remaining from the matched parser limit of the same type.
    const pm = match?.limits.find((pl) => pl.limitType === l.limitType);
    return {
      limit_type: l.limitType,
      remaining_text: l.remainingText,
      remaining_numeric: pm?.remainingNumeric ?? null,
      due_date: l.dueDate ?? pm?.dueDate ?? null,
      threshold_text: pm?.thresholdText ?? null,
      raw_text: l.remainingText,
      sort_order: i,
    };
  });
  return {
    record: {
      report_id: reportId,
      category: a.category,
      registration: a.registration,
      defect_key: defectKey,
      wo_number: a.woNumber,
      defect_id_raw: a.defectIdRaw ?? match?.defectIdRaw ?? null,
      defect_id_normalized: match?.defectIdNormalized ?? null,
      short_title: a.shortTitle,
      full_description: a.fullDescription,
      // Deterministic-only fields backfilled from the parser card.
      issued_date: match?.issuedDate ?? null,
      issue_station: match?.issueStation ?? null,
      doc_reference: match?.docReference ?? null,
      mel_reference: a.melReference ?? match?.melReference ?? null,
      mel_category: a.melCategory ?? match?.melCategory ?? null,
      current_due_date: a.currentDueDate ?? match?.currentDueDate ?? null,
      original_due_date: match?.originalDueDate ?? null,
      concession_due_date: a.isConcession ? a.currentDueDate ?? match?.concessionDueDate ?? null : null,
      is_concession: a.isConcession,
      raw_declared_deadline: match?.rawDeclaredDeadline ?? null,
      source_page_start: match?.sourcePageStart ?? null,
      source_page_end: match?.sourcePageEnd ?? null,
      source_text: match?.sourceText ?? null,
      raw_payload: { source: "ai", defect: a, matchedWo: a.woNumber ?? null },
      // AI cards always get a human review before publish.
      review_required: true,
    },
    limits,
  };
}

export function buildDraftPlan(processed: ProcessedReport, reportId: string): DraftPlan {
  const report: ParsedReport = processed.report;
  const aircraft: DraftAircraft[] = [];
  const summaryAircraft: Array<Record<string, unknown>> = [];

  for (const ac of processed.aircraft) {
    const parserAc = report.aircraft.find((a) => a.registration === ac.registration)!;
    const useAi = ac.aiOk && ac.aiDefects != null && ac.aiDefects.length > 0;
    const parserByWo = new Map<string, ParsedDefect>();
    for (const d of ac.parserDefects) if (d.woNumber) parserByWo.set(d.woNumber, d);

    const defects = useAi
      ? ac.aiDefects!.map((a, i) => recordFromAi(reportId, a, parserByWo, i))
      : ac.parserDefects.map((d) => recordFromParser(reportId, d));

    aircraft.push({
      row: {
        report_id: reportId,
        registration: ac.registration,
        expected_open_count: ac.expectedOpenCount,
        parsed_open_count: parserAc.parsedOpenCount,
        warning_count: parserAc.warningCount,
        source_page_start: parserAc.sourcePageStart,
        source_page_end: parserAc.sourcePageEnd,
      },
      defects,
      source: useAi ? "ai" : "parser",
    });

    summaryAircraft.push({
      registration: ac.registration,
      source: useAi ? "ai" : "parser",
      expectedOpenCount: ac.expectedOpenCount,
      parserCards: ac.parserDefects.length,
      cards: defects.length,
      aiOk: ac.aiOk,
      aiMessage: ac.aiMessage,
    });
  }

  // Any aircraft still carrying a review_required record → whole report needs review.
  const needsReview = aircraft.some((a) => a.defects.some((d) => d.record.review_required));

  return {
    reportPatch: {
      page_count: report.pageCount,
      parser_version: report.parserVersion,
      ai_provider: processed.aiProvider,
      ai_model: null,
      report_generated_at: report.reportGeneratedAt,
      report_generated_at_raw: report.reportGeneratedAtRaw,
      status: needsReview ? "review_required" : "ready_to_publish",
      processing_summary: {
        aiProvider: processed.aiProvider,
        aiUsed: processed.aiUsed,
        totalTokens: processed.totalTokens,
        aircraft: summaryAircraft,
      },
      warnings: report.warnings,
    },
    aircraft,
  };
}
