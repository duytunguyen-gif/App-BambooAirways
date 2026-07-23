/** Orchestrates one AMOS report through the pipeline the /api/defects/process
 *  endpoint will expose:
 *
 *      raw text items ──▶ deterministic parser (always) ──▶ per-aircraft
 *                         optional AI cleanup ──▶ review draft
 *
 *  Pure and server-agnostic (takes already-extracted RawTextItem[]), so it is
 *  unit-testable from fixtures with a `none`/mock provider. The deterministic
 *  parser output is ALWAYS kept at full fidelity; the AI result is attached as a
 *  *suggestion* per aircraft — the uploader reviews and chooses before publish.
 *  Nothing here talks to Supabase or the network directly; the provider does. */
import { parseDefects, buildAircraftSections } from "../../parser/parseDefects.js";
import type { ParsedDefect, ParsedReport, RawTextItem } from "../../parser/types.js";
import { parsedToAiDefect } from "../ai/draftAdapter.js";
import type { AiDefect, AiProvider } from "../ai/types.js";

export interface ProcessedAircraft {
  registration: string;
  /** Header "Open Defects = N" (anchor-row count), if read. */
  expectedOpenCount: number | null;
  /** Deterministic cards — always present, full fidelity. */
  parserDefects: ParsedDefect[];
  /** AI cleanup suggestion, or null when AI did not run / failed. */
  aiDefects: AiDefect[] | null;
  aiOk: boolean;
  aiMessage: string;
  usedTokens: number;
}

export interface ProcessedReport {
  report: ParsedReport;
  aircraft: ProcessedAircraft[];
  aiProvider: string;
  /** True if the provider actually produced a suggestion for ≥1 aircraft. */
  aiUsed: boolean;
  totalTokens: number;
}

export interface ProcessOptions {
  items: RawTextItem[];
  pageCount: number;
  provider: AiProvider;
}

export async function processReport(opts: ProcessOptions): Promise<ProcessedReport> {
  const { items, pageCount, provider } = opts;
  const report = parseDefects(items, pageCount);
  const sections = buildAircraftSections(items);
  const sectionByReg = new Map(sections.map((s) => [s.registration, s]));

  const aircraft: ProcessedAircraft[] = [];
  let aiUsed = false;
  let totalTokens = 0;

  for (const ac of report.aircraft) {
    const parserDefects = ac.defects;
    let aiDefects: AiDefect[] | null = null;
    let aiOk = false;
    let aiMessage = "AI không chạy cho tàu này.";
    let usedTokens = 0;

    // Only call AI when it's available and there is text to clean.
    const section = sectionByReg.get(ac.registration);
    if (provider.available && parserDefects.length > 0 && section) {
      const res = await provider.extract({
        registration: ac.registration,
        category: report.category,
        expectedOpenCount: ac.expectedOpenCount,
        rawText: section.rawText,
        draft: parserDefects.map(parsedToAiDefect),
      });
      aiOk = res.ok;
      aiMessage = res.message;
      usedTokens = res.usedTokens ?? 0;
      totalTokens += usedTokens;
      if (res.ok && res.defects.length > 0) {
        aiDefects = res.defects;
        aiUsed = true;
      }
    } else if (!provider.available) {
      aiMessage = "AI chưa được bật — chỉnh bản nháp của parser thủ công.";
    }

    aircraft.push({
      registration: ac.registration,
      expectedOpenCount: ac.expectedOpenCount,
      parserDefects,
      aiDefects,
      aiOk,
      aiMessage,
      usedTokens,
    });
  }

  return {
    report,
    aircraft,
    aiProvider: provider.name,
    aiUsed,
    totalTokens,
  };
}
