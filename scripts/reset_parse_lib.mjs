/** Label-based parser for reset/fault reference pages.
 *
 *  We deliberately parse by SECTION HEADING TEXT (the labels visible on the
 *  reference pages: "Circuit breakers to reset", "Steps to clear warning", …)
 *  rather than by fragile CSS classes, so it survives markup changes and works
 *  across differently-built pages.
 *
 *  SAFETY: everything produced here is UNVERIFIED. Any field that cannot be
 *  parsed is left null / []. Never guess. The app must treat every crawled
 *  record as verifiedStatus "pending" until a human checks it against the AMM.
 *
 *  Pure & dependency-free so it can be unit-tested and reused by the crawler. */

/** The section labels we understand, mapped to output keys. Order matters:
 *  a section runs until the next known label. */
const SECTIONS = [
  { key: "config", labels: ["aircraft configuration prior to reset", "aircraft configuration"] },
  { key: "cb", labels: ["circuit breakers to reset", "circuit breakers", "circuit breaker"] },
  { key: "steps", labels: ["steps to clear warning", "steps to clear", "procedure"] },
  { key: "duration", labels: ["reset duration", "duration"] },
  { key: "results", labels: ["results of power up test or reset", "results of power up test", "result"] },
  { key: "notes", labels: ["notes", "note"] },
  { key: "signoff", labels: ["sign off", "sign-off", "signoff", "reference"] },
  { key: "deferrals", labels: ["applicable deferrals", "deferrals", "mel"] },
];

/** Split a page's plain text into { faultTitle, sections{key: rawText} }.
 *  `lines` is the page text already split into trimmed non-empty lines. */
export function splitSections(lines) {
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  const sections = {};
  let currentKey = null;
  let faultTitle = null;

  const labelOf = (line) => {
    const low = line.toLowerCase().replace(/[:：]\s*$/, "").trim();
    for (const s of SECTIONS) {
      if (s.labels.some((lab) => low === lab || low.startsWith(lab + ":") || low === lab + ":")) {
        return s.key;
      }
    }
    return null;
  };

  for (const line of clean) {
    const key = labelOf(line);
    if (key) {
      currentKey = key;
      sections[currentKey] = sections[currentKey] ?? [];
      continue;
    }
    if (!currentKey) {
      // Before the first known section, the first substantial line is the title.
      if (!faultTitle && /[A-Za-z]/.test(line)) faultTitle = line;
      continue;
    }
    sections[currentKey].push(line);
  }
  return { faultTitle, sections };
}

const bullets = (arr) =>
  (arr ?? [])
    .map((l) => l.replace(/^[-•✓*]\s*/, "").trim())
    .filter(Boolean);

/** Try to parse the CB block into rows. Recognises "LABEL | PANEL | NUMBER"
 *  tables and pipe/tab/multi-space separated rows. Returns [] if unsure. */
export function parseCircuitBreakers(rawLines) {
  const rows = [];
  for (const line of rawLines ?? []) {
    const low = line.toLowerCase();
    if (/^label\b/.test(low) && low.includes("panel")) continue; // header row
    const parts = line.split(/\s*\|\s*|\t+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      rows.push({
        label: parts[0],
        panel: parts[1],
        number: parts.slice(2).join(" "),
        ...(parts.length > 3 ? {} : {}),
      });
    }
  }
  return rows;
}

/** Parse Pass:/Fail: out of the results section. */
export function parseResults(rawLines) {
  const text = (rawLines ?? []).join("\n");
  const pass = /pass\s*[:：]\s*(.+)/i.exec(text)?.[1]?.trim() ?? null;
  const fail = /fail\s*[:：]\s*(.+)/i.exec(text)?.[1]?.trim() ?? null;
  return { pass, fail };
}

/** Turn parsed sections into a ResetFaultItem-shaped object. Unknown/missing
 *  fields stay null/[]. verifiedStatus is ALWAYS "pending". */
export function toResetItem({ faultTitle, sections }, { sourceUrl, ataChapter } = {}) {
  const results = parseResults(sections.results);
  return {
    id: null, // assigned on import
    aircraftType: "A320 Family",
    ataChapter: ataChapter ?? null,
    ataTitle: null,
    faultTitle: faultTitle ?? null,
    system: null,
    aircraftConfigurationPriorToReset: bullets(sections.config),
    circuitBreakersToReset: parseCircuitBreakers(sections.cb),
    stepsToClearWarning: bullets(sections.steps),
    resetDuration: (sections.duration ?? []).join(" ").trim() || null,
    results: { pass: results.pass, fail: results.fail },
    notes: bullets(sections.notes),
    signOffRefs: bullets(sections.signoff),
    applicableDeferrals: bullets(sections.deferrals),
    warnings: [],
    sourceRef: sourceUrl ?? null,
    sourceUrl: sourceUrl ?? null,
    verifiedStatus: "pending",
    tags: [],
  };
}

/** Full parse: page text -> preview record. */
export function parsePage(pageText, meta = {}) {
  const lines = String(pageText || "").split(/\r?\n/);
  return toResetItem(splitSections(lines), meta);
}
