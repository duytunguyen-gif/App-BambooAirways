/**
 * ECAM Reset+ — reference crawler (PREVIEW ONLY).
 *
 * Opens the reference site, walks same-host links, extracts each page's text,
 * and parses it with reset_parse_lib.mjs into preview records. It writes three
 * files under scripts/crawl-output/ (gitignored) for a human to review:
 *   - crawled-sitemap.json         all discovered URLs
 *   - crawled-reset-preview.json   parsed records (every one verifiedStatus:"pending")
 *   - crawled-reset-preview.md     human-readable preview
 *
 * It DOES NOT touch public/data/reset/ and never imports into the app. Records
 * are UNVERIFIED — fields that cannot be parsed are left null/[].
 *
 * ⚠️ Copyright / ToS: the reference site's content belongs to a third party.
 * Use this only to help locate & structure data; verify every record against
 * the approved AMM/MEL/TSM before marking it "verified". Respect the site's
 * terms and robots. Prefer re-entering data from your own approved documents.
 *
 * Usage:
 *   npm i -D playwright && npx playwright install chromium   # one-time
 *   node scripts/crawl_reset.mjs [startUrl] [--max=40]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePage } from "./reset_parse_lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "crawl-output");

const DEFAULT_START = "http://mobile.airlinetechs.com/airbus/airbusATA.html";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
}

const startUrl = process.argv[2]?.startsWith("http") ? process.argv[2] : DEFAULT_START;
const MAX_PAGES = Number(arg("max", "40"));
const DELAY_MS = Number(arg("delay", "800")); // be polite

/** Guess an ATA chapter number from a URL or page text (e.g. ".../ata22...", "ATA 22"). */
function guessAta(url, text) {
  const fromUrl = /ata[-_]?(\d{2})/i.exec(url)?.[1];
  if (fromUrl) return fromUrl;
  const fromText = /\bATA\s*(\d{2})\b/i.exec(text || "")?.[1];
  return fromText ?? null;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "\n[crawl_reset] Playwright chưa được cài. Chạy:\n" +
        "  npm i -D playwright && npx playwright install chromium\n"
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const startHost = new URL(startUrl).host;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // mobile

  const visited = new Set();
  const queue = [startUrl];
  const sitemap = [];
  const records = [];

  while (queue.length && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      const title = await page.title();
      const text = await page.evaluate(() => document.body?.innerText ?? "");
      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a[href]")).map((a) => a.href)
      );

      sitemap.push({ url, title, links: links.length });

      // Enqueue same-host, not-yet-seen links.
      for (const href of links) {
        try {
          const u = new URL(href);
          if (u.host === startHost && !visited.has(u.href) && !queue.includes(u.href)) {
            queue.push(u.href);
          }
        } catch {
          /* ignore malformed href */
        }
      }

      // Parse pages that look like fault/reset detail pages (contain the CB label).
      const looksLikeDetail = /circuit breaker|reset duration|steps to clear/i.test(text);
      if (looksLikeDetail) {
        const rec = parsePage(text, { sourceUrl: url, ataChapter: guessAta(url, text) });
        if (rec.faultTitle) records.push(rec);
      }

      console.log(`[${visited.size}/${MAX_PAGES}] ${looksLikeDetail ? "★" : " "} ${url}`);
    } catch (e) {
      console.warn(`  ! Bỏ qua ${url}: ${e.message}`);
      sitemap.push({ url, error: e.message });
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  await browser.close();

  await writeFile(
    resolve(OUT_DIR, "crawled-sitemap.json"),
    JSON.stringify({ startUrl, crawledAt: new Date().toISOString(), pages: sitemap }, null, 2)
  );
  await writeFile(
    resolve(OUT_DIR, "crawled-reset-preview.json"),
    JSON.stringify(records, null, 2)
  );
  await writeFile(resolve(OUT_DIR, "crawled-reset-preview.md"), toMarkdown(records, startUrl));

  console.log(
    `\n✓ Xong. ${sitemap.length} trang, ${records.length} record preview.\n` +
      `  → scripts/crawl-output/crawled-sitemap.json\n` +
      `  → scripts/crawl-output/crawled-reset-preview.json\n` +
      `  → scripts/crawl-output/crawled-reset-preview.md\n` +
      `  Tất cả record = "pending". Hãy DUYỆT trước khi import.`
  );
}

function toMarkdown(records, startUrl) {
  const L = [
    `# Reset crawl preview`,
    ``,
    `> Source: ${startUrl}`,
    `> Crawled: ${new Date().toISOString()}`,
    `> ⚠️ UNVERIFIED preview — review against approved AMM/MEL before any use.`,
    ``,
    `Total records: ${records.length}`,
    ``,
  ];
  for (const r of records) {
    L.push(`## ${r.faultTitle ?? "(no title)"}`);
    L.push(`- ATA: ${r.ataChapter ?? "?"} · source: ${r.sourceUrl}`);
    if (r.circuitBreakersToReset.length) {
      L.push(`- CB:`);
      for (const c of r.circuitBreakersToReset) L.push(`  - ${c.label} | ${c.panel} | ${c.number}`);
    }
    if (r.resetDuration) L.push(`- Duration: ${r.resetDuration}`);
    if (r.results.pass) L.push(`- Pass: ${r.results.pass}`);
    if (r.results.fail) L.push(`- Fail: ${r.results.fail}`);
    L.push(``);
  }
  return L.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
