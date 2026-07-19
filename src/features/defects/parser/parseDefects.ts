/** Deterministic parser for AMOS "ADD B/C DEFECT LIST" PDFs.
 *
 *  Input is a flat list of positioned text runs (RawTextItem[]) — produced by
 *  extractText.ts in Node, or by a committed fixture in tests. This module is
 *  intentionally pure (no pdfjs/DOM) so it is fully unit-testable.
 *
 *  Layout model (X coordinate bands, from the real reports):
 *    WO anchor  x<70    "A227/WO 1043412"
 *    REMAINING  95..172  "3 Day" | "188 FC" | "2579:19 FH"
 *    DUE DATE   172..235 "19.Jul.2026"  (+ "(Concession)")
 *    DOC REFER  235..320 "MEL 34-40-04A , CAT C"
 *    DESC       315..500 defect statement
 *    FIRST ACT  500..665 first-action / expanded statement
 *    Iss.Date/Station x 30..55
 *  A Part Request sub-block (started by a "Req. Qty … Part Request" header) is
 *  skipped entirely per spec.
 */
import type {
  DefectCategory,
  ParsedAircraft,
  ParsedDefect,
  ParsedLimit,
  ParsedReport,
  ParserWarning,
  RawTextItem,
  LimitType,
} from "./types";
import {
  combineReportTimestamp,
  parseAmosDate,
  parseDeclaredDeadline,
} from "../utils/dates";

export const PARSER_VERSION = "1.0.0";

interface Line {
  page: number;
  y: number;
  items: RawTextItem[];
}

// ---- line assembly --------------------------------------------------------

function toLines(items: RawTextItem[]): Line[] {
  const byPage = new Map<number, RawTextItem[]>();
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const arr = byPage.get(it.page) ?? [];
    arr.push(it);
    byPage.set(it.page, arr);
  }
  const lines: Line[] = [];
  for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
    const arr = byPage.get(page)!.slice().sort((a, b) => b.y - a.y || a.x - b.x);
    let cur: RawTextItem[] = [];
    let curY: number | null = null;
    const flush = () => {
      if (cur.length) {
        lines.push({ page, y: curY!, items: cur.slice().sort((a, b) => a.x - b.x) });
      }
      cur = [];
    };
    for (const it of arr) {
      if (curY === null || Math.abs(it.y - curY) <= 2) {
        cur.push(it);
        curY = curY === null ? it.y : curY;
      } else {
        flush();
        cur = [it];
        curY = it.y;
      }
    }
    flush();
  }
  return lines;
}

/** Join, trim and de-duplicate the text of items whose x falls in [lo, hi). */
function colText(line: Line, lo: number, hi: number): string {
  const parts: string[] = [];
  for (const it of line.items) {
    if (it.x < lo || it.x >= hi) continue;
    const s = it.str.trim();
    if (!s) continue;
    if (parts[parts.length - 1] === s) continue; // drop pdfjs double-render
    parts.push(s);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// ---- structural predicates ------------------------------------------------

const RE_AIRCRAFT = /^VN-A\d+[A-Z]?$/;
const RE_OPEN = /Open Defects\s*=\s*(\d+)/i;
const RE_WO_ANCHOR = /^A\d+[A-Z]?\/WO(?:\s+(\d+))?/;
const RE_NOISE = /ADD [BC] DEFECT LIST|Page \d+\s*\/\s*\d+|produced by|www\.swiss-as\.com|Form has been updated|A\.C\/ WO No|Defect Type\s*:/i;

function lineText(line: Line): string {
  return line.items.map((i) => i.str.trim()).filter(Boolean).join(" ");
}

function isNoise(line: Line): boolean {
  return RE_NOISE.test(lineText(line));
}

function findAircraft(line: Line): { reg: string; open: number | null } | null {
  const reg = line.items.find((i) => RE_AIRCRAFT.test(i.str.trim()));
  if (!reg) return null;
  const openM = lineText(line).match(RE_OPEN);
  return { reg: reg.str.trim(), open: openM ? Number(openM[1]) : null };
}

/** Anchor item (x<70) marking a defect / limit row; returns WO or null. */
function findAnchor(line: Line): { wo: string | null } | null {
  const it = line.items.find((i) => i.x < 70 && RE_WO_ANCHOR.test(i.str.trim()));
  if (!it) return null;
  const m = it.str.trim().match(RE_WO_ANCHOR);
  return { wo: m && m[1] ? m[1] : null };
}

const RE_REMAIN =
  /^(\d[\d',.]*(?::\d+)?)\s*(Day|FC|FH)$/i;

function findRemaining(line: Line): ParsedLimit | null {
  for (const it of line.items) {
    if (it.x < 95 || it.x >= 172) continue;
    const s = it.str.trim();
    const m = s.match(RE_REMAIN);
    if (!m) continue;
    const unit = m[2].toUpperCase();
    const limitType: LimitType = unit === "DAY" ? "day" : unit === "FC" ? "fc" : "fh";
    const numeric = parseRemainNumeric(m[1], limitType);
    return {
      limitType,
      remainingText: s,
      remainingNumeric: numeric,
      dueDate: null,
      thresholdText: null,
      rawText: s,
      sortOrder: 0,
    };
  }
  return null;
}

function parseRemainNumeric(token: string, type: LimitType): number | null {
  const clean = token.replace(/['\s]/g, "");
  if (type === "fh") {
    const m = clean.match(/^(\d+)(?::(\d+))?$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    return Math.round((h + min / 60) * 100) / 100;
  }
  const n = Number(clean.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function findDueDate(line: Line): string | null {
  for (const it of line.items) {
    if (it.x < 172 || it.x >= 235) continue;
    const iso = parseAmosDate(it.str.trim());
    if (iso) return iso;
  }
  return null;
}

// ---- defect finalisation --------------------------------------------------

function normalizeDefectId(raw: string): string {
  return raw
    .replace(/^ADD\s*/i, "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/[":]+$/g, "");
}

function extractDefectId(
  category: DefectCategory,
  text: string
): { raw: string; normalized: string } | null {
  const re = new RegExp(`(ADD\\s*)?(${category})\\s?0*\\d{3,}(-\\d+)?`, "i");
  const m = text.match(re);
  if (!m) return null;
  const raw = m[0].trim().replace(/:$/, "");
  return { raw, normalized: normalizeDefectId(raw) };
}

function makeShortTitle(fullDescription: string, category: DefectCategory): string {
  let s = (fullDescription.split("\n")[0] || fullDescription).trim();
  // strip a leading "ADD B123456-01:" style prefix
  s = s.replace(new RegExp(`^(ADD\\s*)?${category}\\s?\\d[\\d-]*\\s*:?\\s*`, "i"), "");
  s = s.replace(/^["“]/, "").replace(/["”]$/, "").trim();
  if (s.length <= 60) return s;
  const cut = s.slice(0, 60);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut).trim();
}

function finalizeDefect(d: WipDefect, category: DefectCategory): ParsedDefect {
  const warnings: ParserWarning[] = [];
  const fullDescription = dedupeLines(d.descLines).join("\n").trim();
  const firstAction = dedupeLines(d.actionLines).join("\n").trim();
  const searchText = `${fullDescription}\n${firstAction}`;

  const id = extractDefectId(category, searchText);
  if (!id) {
    warnings.push({
      code: "MISSING_DEFECT_ID",
      message: `Không tìm thấy Defect ID cho WO ${d.wo ?? "(không có WO)"}.`,
      registration: d.registration,
    });
  }

  // limits: assign due dates, sort order
  const limits = d.limits.map((l, i) => ({ ...l, sortOrder: i }));

  // effective current due date: prefer a day/calendar limit's due, else earliest
  const dayLimit = limits.find((l) => l.limitType === "day" || l.limitType === "calendar");
  const dueCandidates = limits.map((l) => l.dueDate).filter(Boolean) as string[];
  const earliest = dueCandidates.sort()[0] ?? null;
  const currentDueDate = dayLimit?.dueDate ?? earliest;

  // declared deadline in the narrative
  const dlMatch = searchText.match(/DEAD\s?LINE[:.\s]*([0-9][0-9A-Za-z./-]*)/i);
  const rawDeclaredDeadline = dlMatch ? dlMatch[1] : null;
  const declaredISO = parseDeclaredDeadline(rawDeclaredDeadline);

  let originalDueDate: string | null = null;
  let concessionDueDate: string | null = null;
  if (d.isConcession) {
    concessionDueDate = currentDueDate;
    originalDueDate = declaredISO && declaredISO !== currentDueDate ? declaredISO : null;
  } else if (declaredISO && currentDueDate && declaredISO !== currentDueDate) {
    warnings.push({
      code: "DUE_DATE_MISMATCH",
      message: `DUE DATE (${currentDueDate}) khác deadline khai báo trong mô tả (${declaredISO}). Cần kiểm tra.`,
      registration: d.registration,
    });
  }

  if (!currentDueDate && limits.some((l) => l.limitType === "day")) {
    warnings.push({
      code: "MISSING_DUE_DATE",
      message: `Không đọc được DUE DATE cho WO ${d.wo ?? "?"}.`,
      registration: d.registration,
    });
  }
  if (limits.length === 0) {
    warnings.push({
      code: "NO_LIMITS",
      message: `Không đọc được giới hạn (Day/FH/FC) cho WO ${d.wo ?? "?"}.`,
      registration: d.registration,
    });
  }

  const docRef = d.docRef.trim() || null;
  const melM = (docRef ?? searchText).match(/([0-9]{2}-[0-9]{2}-[0-9]{2}[A-Z]?)\b[^,]*,?\s*CAT\s*([A-Z])/i);

  const defectKey = d.wo
    ? `${category}|${d.registration}|${d.wo}`
    : `${category}|${d.registration}|${id?.normalized ?? "ROW" + d.rowIndex}`;

  return {
    category,
    registration: d.registration,
    defectKey,
    woNumber: d.wo,
    defectIdRaw: id?.raw ?? null,
    defectIdNormalized: id?.normalized ?? null,
    shortTitle: makeShortTitle(fullDescription || firstAction, category),
    fullDescription: fullDescription || firstAction,
    issuedDate: d.issuedDate,
    issueStation: d.issueStation,
    docReference: docRef,
    melReference: melM ? melM[1] : null,
    melCategory: melM ? melM[2] : null,
    currentDueDate,
    originalDueDate,
    concessionDueDate,
    isConcession: d.isConcession,
    rawDeclaredDeadline,
    limits,
    sourcePageStart: d.pageStart,
    sourcePageEnd: d.pageEnd,
    sourceText: searchText.trim(),
    reviewRequired: warnings.some(
      (w) => w.code === "DUE_DATE_MISMATCH" || w.code === "MISSING_DUE_DATE" || w.code === "NO_LIMITS"
    ),
    warnings,
  };
}

function dedupeLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const s = raw.trim();
    if (!s) continue;
    if (out.includes(s)) continue;
    out.push(s);
  }
  return out;
}

// ---- work-in-progress accumulator ----------------------------------------

interface WipDefect {
  registration: string;
  wo: string | null;
  rowIndex: number;
  limits: ParsedLimit[];
  descLines: string[];
  actionLines: string[];
  docRef: string;
  issuedDate: string | null;
  issueStation: string | null;
  isConcession: boolean;
  skipParts: boolean;
  pageStart: number;
  pageEnd: number;
}

// ---- main entry -----------------------------------------------------------

export function parseDefects(items: RawTextItem[], pageCount: number): ParsedReport {
  const lines = toLines(items);

  // report category + generated time
  const joined = lines.map(lineText).join("\n");
  const category: DefectCategory = /ADD C DEFECT LIST|Defect Type\s*:\s*C/i.test(joined)
    ? "C"
    : "B";

  let genDateRaw: string | null = null;
  let genTimeRaw: string | null = null;
  for (const line of lines.slice(0, 12)) {
    for (const it of line.items) {
      if (it.x < 640) continue;
      const s = it.str.trim();
      if (!genDateRaw && /^\d{1,2}\.[A-Za-z]{3}\.\d{4}$/.test(s)) genDateRaw = s;
      if (!genTimeRaw && /^\d{1,2}:\d{2}$/.test(s)) genTimeRaw = s;
    }
    if (genDateRaw && genTimeRaw) break;
  }
  const reportGeneratedAt = combineReportTimestamp(genDateRaw, genTimeRaw);
  const reportGeneratedAtRaw =
    genDateRaw || genTimeRaw ? `${genDateRaw ?? ""} ${genTimeRaw ?? ""}`.trim() : null;

  const aircraft: ParsedAircraft[] = [];
  const reportWarnings: ParserWarning[] = [];

  let curAc: {
    registration: string;
    expected: number | null;
    defects: WipDefect[];
    byWo: Map<string, WipDefect>;
    /** Count of anchor (limit) rows — this is what AMOS "Open Defects" totals,
     *  so it is what we reconcile against the header. Distinct from the grouped
     *  defect count (defects.length) shown to viewers. */
    rowCount: number;
    pageStart: number;
    pageEnd: number;
  } | null = null;
  let curDefect: WipDefect | null = null;
  let rowCounter = 0;

  const closeAircraft = () => {
    if (!curAc) return;
    const finalized = curAc.defects.map((d) => finalizeDefect(d, category));
    const warningCount = finalized.reduce((n, d) => n + d.warnings.length, 0);
    aircraft.push({
      registration: curAc.registration,
      expectedOpenCount: curAc.expected,
      // Reconcile against AMOS' row-based header count, not the grouped count.
      parsedOpenCount: curAc.rowCount,
      defects: finalized,
      sourcePageStart: curAc.pageStart,
      sourcePageEnd: curAc.pageEnd,
      warningCount,
    });
    curAc = null;
    curDefect = null;
  };

  for (const line of lines) {
    const ac = findAircraft(line);
    if (ac) {
      closeAircraft();
      curAc = {
        registration: ac.reg,
        expected: ac.open,
        defects: [],
        byWo: new Map(),
        rowCount: 0,
        pageStart: line.page,
        pageEnd: line.page,
      };
      continue;
    }
    if (!curAc) continue;
    if (isNoise(line)) continue;
    curAc.pageEnd = line.page;

    const anchor = findAnchor(line);
    if (anchor) {
      curAc.rowCount += 1;
      const remaining = findRemaining(line);
      const due = findDueDate(line);
      if (remaining) remaining.dueDate = due;

      const existing = anchor.wo ? curAc.byWo.get(anchor.wo) : null;
      if (existing) {
        curDefect = existing;
        if (remaining) existing.limits.push(remaining);
      } else {
        curDefect = {
          registration: curAc.registration,
          wo: anchor.wo,
          rowIndex: rowCounter++,
          limits: remaining ? [remaining] : [],
          descLines: [],
          actionLines: [],
          docRef: "",
          issuedDate: null,
          issueStation: null,
          isConcession: false,
          skipParts: false,
          pageStart: line.page,
          pageEnd: line.page,
        };
        curAc.defects.push(curDefect);
        if (anchor.wo) curAc.byWo.set(anchor.wo, curDefect);
      }
      curDefect.pageEnd = line.page;
      // collect this row's narrative columns
      collectNarrative(line, curDefect);
      continue;
    }

    if (!curDefect) continue;
    const lt = lineText(line);
    if (/Part Request|Req\.\s*Qty|Part Description/i.test(lt)) {
      curDefect.skipParts = true;
      continue;
    }
    if (curDefect.skipParts) continue;
    if (/^\s*\(?\s*Noted by|Request date:|Ordered by|Updated by/i.test(lt)) continue;
    collectNarrative(line, curDefect);
    curDefect.pageEnd = line.page;
  }
  closeAircraft();

  // count reconciliation warnings
  let totalExpected: number | null = 0;
  let totalParsed = 0;
  for (const ac of aircraft) {
    totalParsed += ac.parsedOpenCount;
    if (ac.expectedOpenCount == null) totalExpected = totalExpected;
    else if (totalExpected != null) totalExpected += ac.expectedOpenCount;
    if (ac.expectedOpenCount != null && ac.expectedOpenCount !== ac.parsedOpenCount) {
      reportWarnings.push({
        code: "COUNT_MISMATCH",
        message: `Cảnh báo: PDF báo ${ac.expectedOpenCount} defects nhưng hệ thống nhận diện ${ac.parsedOpenCount} cho ${ac.registration}.`,
        registration: ac.registration,
      });
    }
  }

  return {
    category,
    reportGeneratedAtRaw,
    reportGeneratedAt,
    pageCount,
    parserVersion: PARSER_VERSION,
    aircraft,
    warnings: reportWarnings,
    totalExpected,
    totalParsed,
  };
}

/** One aircraft's raw text section — the deterministic reading-order text used
 *  to feed an AI cleanup pass (see services/ai). Noise lines are dropped; the
 *  header count is carried through so the AI result can be reconciled. */
export interface AircraftSection {
  registration: string;
  expectedOpenCount: number | null;
  pageStart: number;
  pageEnd: number;
  rawText: string;
}

/** Segment the flat text runs into per-aircraft reading-order text blocks,
 *  reusing the same aircraft-header + noise detection as the parser so the two
 *  stay in lock-step. Pure; no pdfjs/DOM. */
export function buildAircraftSections(items: RawTextItem[]): AircraftSection[] {
  const lines = toLines(items);
  const sections: AircraftSection[] = [];
  let cur: AircraftSection | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (cur) {
      cur.rawText = buf.join("\n").trim();
      sections.push(cur);
    }
    cur = null;
    buf = [];
  };
  for (const line of lines) {
    const ac = findAircraft(line);
    if (ac) {
      flush();
      cur = {
        registration: ac.reg,
        expectedOpenCount: ac.open,
        pageStart: line.page,
        pageEnd: line.page,
        rawText: "",
      };
      buf.push(lineText(line));
      continue;
    }
    if (!cur) continue;
    if (isNoise(line)) continue;
    cur.pageEnd = line.page;
    const t = lineText(line).trim();
    if (t) buf.push(t);
  }
  flush();
  return sections;
}

function collectNarrative(line: Line, d: WipDefect) {
  // AMOS shifts the defect statement between two column bands depending on the
  // template: a short "defect type" stub sits around x315..500 and the full
  // statement around x500..665 (sometimes the full statement is in the first
  // band and the second is empty). Coordinate-only splitting therefore loses the
  // real text — e.g. a card showing only "CARGO ARE DAMAGE" while the full
  // "PANEL MAT BALL 132NF ... AT FWD CARGO ARE DAMAGE, MEL ..." lives in the
  // second band. Merge both bands into one description, preferring the longer
  // text and avoiding the stub-then-full duplication.
  const short = colText(line, 315, 500);
  const long = colText(line, 500, 665);
  let statement = "";
  if (short && long) statement = long.includes(short) ? long : `${short} ${long}`;
  else statement = long || short;
  const doc = colText(line, 235, 315);
  const iss = lineText(line);

  if (statement) d.descLines.push(statement);
  if (doc && !d.docRef) d.docRef = doc;

  const issDate = iss.match(/\(Iss\.Date:\s*([\d.A-Za-z]+)\s*\)/);
  if (issDate && !d.issuedDate) d.issuedDate = parseAmosDate(issDate[1]);
  const issSta = iss.match(/\(Iss\.Station:\s*([A-Z]+)\s*\)/);
  if (issSta && !d.issueStation) d.issueStation = issSta[1];
  if (/\(Concession\)/i.test(iss)) d.isConcession = true;
}
