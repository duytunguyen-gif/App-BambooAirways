/**
 * ECAM Reset+ — reference crawler (writes app data, all records "pending").
 *
 * The reference site is static HTML over HTTP, so this uses plain fetch (no
 * Playwright). It walks the ATA list → each chapter → each fault page, parses
 * the TEXT fields, and downloads the circuit-breaker CHART IMAGES locally
 * (the source shows CBs as pictures, not text — so we display the original
 * verbatim instead of transcribing/guessing).
 *
 * Output (written directly so the app is populated for review):
 *   public/data/reset/index.json
 *   public/data/reset/ata-XX.json
 *   public/data/reset/images/XX/*.gif
 *
 * ⚠️ SAFETY / COPYRIGHT: every record is verifiedStatus:"pending" and carries
 * its sourceRef. Content belongs to airlinetechs (Tobin Miklas), marked
 * "Training Only". This is for internal training/reference; verify against the
 * approved AMM/MEL/TSM before operational use. Be polite (throttled).
 *
 * Usage:  node scripts/crawl_reset.mjs [--max=1000] [--delay=150]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFaultHtml, parseChapterLinks } from "./reset_html_parse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "public", "data", "reset");
const IMG_DIR = resolve(DATA_DIR, "images");

const BASE = "http://mobile.airlinetechs.com/airbus/";
const INDEX_URL = BASE + "airbusATA.html";
const UA = "Mozilla/5.0 (Android) BambooResetTool/1.0 (internal training)";

const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.split("=")[1] : d;
};
const MAX = Number(arg("max", "1000"));
const DELAY = Number(arg("delay", "150"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function uniqueSlug(base, used) {
  let slug = slugify(base) || "item";
  if (!used.has(slug)) return used.add(slug), slug;
  let n = 2;
  while (used.has(`${slug}-${n}`)) n++;
  used.add(`${slug}-${n}`);
  return `${slug}-${n}`;
}

async function fetchText(url, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500);
    }
  }
}

async function downloadImage(url, destPath, referer) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  // Referer is REQUIRED: the site serves an anti-hotlink placeholder image to
  // requests without the page referer.
  const headers = { "User-Agent": UA };
  if (referer) headers.Referer = referer;
  const res = await fetch(url, { headers, redirect: "follow", signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!/image\//i.test(ct)) throw new Error(`không phải ảnh (content-type=${ct})`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
}

function cleanItem(rec, { id, ataTitle }) {
  const out = {
    id,
    aircraftType: "A320 Family",
    ataChapter: rec.ataChapter,
    ataTitle,
    faultTitle: rec.faultTitle,
    aircraftConfigurationPriorToReset: rec.aircraftConfigurationPriorToReset,
    circuitBreakersToReset: [],
    stepsToClearWarning: rec.stepsToClearWarning,
    results: {
      ...(rec.results.pass ? { pass: rec.results.pass } : {}),
      ...(rec.results.fail ? { fail: rec.results.fail } : {}),
    },
    verifiedStatus: "pending",
    sourceRef: rec.sourceRef,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  if (rec.cbImage) out.cbImage = rec.cbImage;
  if (rec.resetDuration) out.resetDuration = rec.resetDuration;
  if (rec.notes.length) out.notes = rec.notes;
  if (rec.signOffRefs.length) out.signOffRefs = rec.signOffRefs;
  if (rec.applicableDeferrals.length) out.applicableDeferrals = rec.applicableDeferrals;
  if (rec.warnings.length) out.warnings = rec.warnings;
  return out;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  console.log(`Tải danh mục ATA: ${INDEX_URL}`);
  const indexHtml = await fetchText(INDEX_URL);

  const chapters = [];
  const chRe = /<a href="(\d+)\/Achapter\d+\.html"[^>]*>\s*<span class="name">([\s\S]*?)<\/span>/gi;
  for (const m of indexHtml.matchAll(chRe)) {
    const ata = m[1];
    const title = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/^chapter\s*\d+\s*[-–]\s*/i, "")
      .trim();
    if (!chapters.some((c) => c.ata === ata)) chapters.push({ ata, title });
  }
  console.log(`Tìm thấy ${chapters.length} chương.`);

  const usedIds = new Set();
  const indexChapters = [];
  let totalItems = 0;
  let pageCount = 0;

  for (const { ata, title } of chapters) {
    if (pageCount >= MAX) break;
    const chapterUrl = `${BASE}${ata}/Achapter${ata}.html`;
    let links = [];
    try {
      const chHtml = await fetchText(chapterUrl);
      links = parseChapterLinks(chHtml);
    } catch (e) {
      console.warn(`  ! Chương ${ata} lỗi: ${e.message}`);
      continue;
    }
    await sleep(DELAY);

    const items = [];
    for (const link of links) {
      if (pageCount >= MAX) break;
      const faultUrl = `${BASE}${ata}/${link.href}`;
      pageCount++;
      try {
        const html = await fetchText(faultUrl);
        const rec = parseFaultHtml(html, { sourceUrl: faultUrl, ataChapter: ata, ataTitle: title });
        if (!rec.faultTitle) {
          console.warn(`    ~ Bỏ (không title): ${faultUrl}`);
          continue;
        }
        const id = uniqueSlug(rec.faultTitle, usedIds);

        // Download the CB chart image locally, if any.
        if (rec.cbImageUrl) {
          const base = rec.cbImageUrl.split("/").pop().split("?")[0];
          const relPath = `data/reset/images/${ata}/${base}`;
          try {
            await downloadImage(rec.cbImageUrl, resolve(DATA_DIR, "images", ata, base), faultUrl);
            rec.cbImage = relPath;
            await sleep(DELAY);
          } catch (e) {
            console.warn(`    ~ Ảnh CB lỗi (${base}): ${e.message}`);
          }
        }

        items.push(cleanItem(rec, { id, ataTitle: title }));
        console.log(`  [${pageCount}] ATA ${ata} ✓ ${rec.faultTitle}`);
      } catch (e) {
        console.warn(`    ! ${faultUrl}: ${e.message}`);
      }
      await sleep(DELAY);
    }

    const verified = 0; // all pending
    indexChapters.push({
      ataNumber: ata,
      ataTitle: title,
      sortOrder: Number(ata),
      count: items.length,
      verifiedCount: verified,
      pendingCount: items.length,
    });
    totalItems += items.length;

    if (items.length) {
      await writeFile(
        resolve(DATA_DIR, `ata-${ata}.json`),
        JSON.stringify({ ataNumber: ata, ataTitle: title, items }, null, 2)
      );
    }
    console.log(`--- ATA ${ata} (${title}): ${items.length} mục ---`);
  }

  indexChapters.sort((a, b) => a.sortOrder - b.sortOrder);
  await writeFile(
    resolve(DATA_DIR, "index.json"),
    JSON.stringify(
      {
        aircraftType: "A320 Family",
        generatedAt: new Date().toISOString().slice(0, 10),
        source: "http://mobile.airlinetechs.com/airbus/ (Training Only — Tobin Miklas)",
        totalItems,
        chapters: indexChapters,
      },
      null,
      2
    )
  );

  console.log(
    `\n✓ Xong. ${indexChapters.length} chương, ${totalItems} mục (tất cả PENDING).\n` +
      `  Ghi vào public/data/reset/. Ảnh CB trong public/data/reset/images/.\n` +
      `  Hãy đối chiếu AMM trước khi đổi sang "verified".`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
