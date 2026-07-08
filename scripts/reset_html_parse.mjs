/** HTML parser tailored to the airlinetechs mobile reset pages.
 *
 *  Page shape (observed):
 *    <span class="graytitle">FAULT TITLE</span>
 *    <span class="header">Section label:</span>
 *    <p>[<img radiobutton>] text</p> ...        (until the next header)
 *  Circuit-breaker data is a GIF IMAGE, not text, so it CANNOT be read here —
 *  we capture the image URL and leave circuitBreakersToReset = [] for a human
 *  to fill after verifying against the approved AMM.
 *
 *  SAFETY: every record is verifiedStatus "pending". Nothing is guessed;
 *  unparseable fields are null / []. Pure & dependency-free (testable). */

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<img[^>]*>/gi, "") // drop images (radiobutton bullets etc.)
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Turn a section's inner HTML into an array of bullet lines: one per <p>, and
 *  <br> inside a <p> splits into separate lines (used by multi-line sign-off). */
function bodyToLines(html) {
  const paras = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  const chunks = paras.length ? paras : [html];
  const lines = [];
  for (const c of chunks) {
    for (const part of c.split(/<br\s*\/?>/i)) {
      const t = stripTags(part);
      if (t) lines.push(t);
    }
  }
  return lines;
}

const LABEL_MAP = [
  ["aircraft configuration prior to reset", "config"],
  ["circuit breakers to reset", "cb"],
  ["circuit breakers", "cb"],
  ["steps to clear warning", "steps"],
  ["reset duration", "duration"],
  ["results of power up test or reset", "results"],
  ["notes", "notes"],
  ["note", "notes"],
  ["sign off", "signoff"],
  ["sign-off", "signoff"],
  ["applicable deferrals", "deferrals"],
];

function fieldForLabel(label) {
  const low = label.toLowerCase().replace(/[:：]\s*$/, "").trim();
  for (const [needle, key] of LABEL_MAP) if (low.startsWith(needle)) return key;
  return null;
}

function parseResults(html) {
  const text = stripTags(html.replace(/<br\s*\/?>/gi, "\n"));
  const pass = /pass\s*[:：]?\s*(.+?)(?:\bfail\b|$)/i.exec(text)?.[1]?.trim() ?? null;
  const fail = /fail\s*[:：]?\s*(.+)/i.exec(text)?.[1]?.trim() ?? null;
  return {
    pass: pass ? pass.replace(/[.\s]+$/, (m) => (m.includes(".") ? "." : "")) || pass : null,
    fail: fail || null,
  };
}

/** Parse one fault detail page's HTML into a ResetFaultItem-shaped object. */
export function parseFaultHtml(html, { sourceUrl = null, ataChapter = null, ataTitle = null } = {}) {
  const title =
    /<span class="graytitle">([\s\S]*?)<\/span>/i.exec(html)?.[1];
  const faultTitle = title ? stripTags(title) : null;

  // Slice out the content region and split into (header -> body) sections.
  const region =
    /<span class="graytitle">[\s\S]*?(<span class="header">[\s\S]*?)<\/ul>/i.exec(html)?.[1] ?? html;
  const sectionRe =
    /<span class="header">([\s\S]*?)<\/span>([\s\S]*?)(?=<span class="header">|$)/gi;

  const out = {
    id: null,
    aircraftType: "A320 Family",
    ataChapter,
    ataTitle,
    faultTitle,
    system: null,
    aircraftConfigurationPriorToReset: [],
    circuitBreakersToReset: [], // images on source — must be entered by hand
    stepsToClearWarning: [],
    resetDuration: null,
    results: { pass: null, fail: null },
    notes: [],
    signOffRefs: [],
    applicableDeferrals: [],
    warnings: [],
    cbImageUrl: null,
    sourceRef: sourceUrl,
    sourceUrl,
    verifiedStatus: "pending",
    tags: [],
  };

  for (const m of region.matchAll(sectionRe)) {
    const key = fieldForLabel(stripTags(m[1]));
    const body = m[2];
    if (!key) continue;
    switch (key) {
      case "config":
        out.aircraftConfigurationPriorToReset = bodyToLines(body);
        break;
      case "cb": {
        const img = /<img[^>]+src="([^"]+\.gif)"/i.exec(body)?.[1] ?? null;
        if (img) {
          out.cbImageUrl = new URL(img, sourceUrl ?? "http://mobile.airlinetechs.com/").href;
          out.warnings.push(
            "Bảng Circuit Breaker ở trang gốc là ẢNH — cần nhập tay & đối chiếu AMM. Ảnh: " +
              out.cbImageUrl
          );
        }
        break;
      }
      case "steps":
        out.stepsToClearWarning = bodyToLines(body);
        break;
      case "duration":
        out.resetDuration = bodyToLines(body).join(" ") || null;
        break;
      case "results":
        out.results = parseResults(body);
        break;
      case "notes":
        out.notes = bodyToLines(body);
        break;
      case "signoff":
        out.signOffRefs = bodyToLines(body);
        break;
      case "deferrals":
        out.applicableDeferrals = bodyToLines(body);
        break;
    }
  }
  return out;
}

/** Parse a chapter list page into [{ title, href }] fault links (skips the
 *  "ALL CHAPTER xx CIRCUIT BREAKERS" aggregate page). */
export function parseChapterLinks(html) {
  const links = [];
  const re = /<a href="([^"]+\.html)">\s*<span class="name">([\s\S]*?)<\/span>/gi;
  for (const m of html.matchAll(re)) {
    const href = m[1];
    const name = stripTags(m[2]);
    if (/allcircuitbreakers/i.test(href) || /ALL CHAPTER/i.test(name)) continue;
    links.push({ href, title: name });
  }
  return links;
}

export { stripTags, bodyToLines };
