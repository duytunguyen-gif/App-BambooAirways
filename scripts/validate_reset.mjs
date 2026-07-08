/**
 * Validates the committed reset seed data in public/data/reset/.
 * Run: node scripts/validate_reset.mjs   (exit 1 on any error)
 *
 * Checks:
 *  - every item has a non-empty faultTitle and ataChapter,
 *  - every circuit breaker has label + panel + number,
 *  - verifiedStatus is one of verified|pending|needs_review,
 *  - item ids are unique across all chapters,
 *  - index.json chapter counts match the per-chapter files.
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "data", "reset");
const STATUSES = new Set(["verified", "pending", "needs_review"]);

const errors = [];
const warnings = [];

async function readJson(name) {
  return JSON.parse(await readFile(resolve(DIR, name), "utf8"));
}

function validateItem(item, where, ids) {
  if (!item.faultTitle || !String(item.faultTitle).trim())
    errors.push(`${where}: thiếu faultTitle`);
  if (!item.ataChapter || !String(item.ataChapter).trim())
    errors.push(`${where}: thiếu ataChapter`);
  if (!item.id) errors.push(`${where}: thiếu id`);
  else if (ids.has(item.id)) errors.push(`${where}: id trùng "${item.id}"`);
  else ids.add(item.id);

  if (item.verifiedStatus && !STATUSES.has(item.verifiedStatus))
    errors.push(`${where}: verifiedStatus không hợp lệ "${item.verifiedStatus}"`);
  if (!item.verifiedStatus) warnings.push(`${where}: thiếu verifiedStatus (mặc định pending)`);

  (item.circuitBreakersToReset ?? []).forEach((cb, i) => {
    if (!cb.label || !cb.panel || !cb.number)
      errors.push(`${where}: CB[${i}] thiếu label/panel/number`);
  });
}

async function main() {
  let index;
  try {
    index = await readJson("index.json");
  } catch (e) {
    console.error(`Không đọc được index.json: ${e.message}`);
    process.exit(1);
  }

  const ids = new Set();
  const actualCounts = {};

  const files = (await readdir(DIR)).filter((f) => /^ata-.*\.json$/.test(f));
  for (const file of files) {
    const chapter = await readJson(file);
    const items = chapter.items ?? [];
    actualCounts[chapter.ataNumber] = items.length;
    items.forEach((it, i) => validateItem(it, `${file}#${i}`, ids));
  }

  // Cross-check index counts.
  for (const c of index.chapters) {
    const actual = actualCounts[c.ataNumber] ?? 0;
    if (c.count !== actual)
      errors.push(`index.json ATA ${c.ataNumber}: count=${c.count} nhưng file có ${actual} mục`);
  }
  const totalActual = Object.values(actualCounts).reduce((a, b) => a + b, 0);
  if (index.totalItems !== totalActual)
    warnings.push(`index.json totalItems=${index.totalItems} nhưng thực tế ${totalActual}`);

  console.log(`Kiểm tra ${files.length} file chương, ${ids.size} mục.`);
  warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  if (errors.length) {
    console.error(`\n✗ ${errors.length} lỗi:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("✓ Dữ liệu hợp lệ.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
