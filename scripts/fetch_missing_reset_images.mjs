/** One-off: re-scan the source fault pages that ended up with NO circuit-breaker
 *  image, download any content illustration the original parser missed, save it
 *  under public/data/reset/images/{ata}/ (with a hotlink-safe Referer header),
 *  and patch the matching item's `cbImages` array in the ata-XX.json files.
 *
 *  Pure fetch + fs; run with: node scripts/fetch_missing_reset_images.mjs
 *  Only touches items that currently have neither CB text nor a CB image. */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "public", "data", "reset");
const IMG_ROOT = path.join(DATA, "images");
const BASE = "http://mobile.airlinetechs.com/airbus/";

const cleanName = (n) => decodeURIComponent(n).replace(/[^\w.\-]+/g, "_");

/** Extract content illustration srcs (../../images/{ata}/xxx) from a page. */
function contentImages(html) {
  return [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter((s) => /\/images\/\d+\//i.test(s));
}

async function download(absUrl, referer, destAbs) {
  const res = await fetch(absUrl, {
    headers: { Referer: referer, "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(25000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Hotlink guard returns a tiny "Attn.gif" placeholder (~1821 bytes).
  if (buf.length < 2200 && /attn/i.test(res.url)) throw new Error("hotlink placeholder");
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, buf);
  return buf.length;
}

const files = fs.readdirSync(DATA).filter((f) => /^ata-\d+\.json$/.test(f));
let patched = 0,
  imgOk = 0,
  imgFail = 0;

for (const f of files) {
  const p = path.join(DATA, f);
  const doc = JSON.parse(fs.readFileSync(p, "utf8"));
  const arr = Array.isArray(doc) ? doc : doc.items;
  let dirty = false;

  for (const it of arr) {
    const hasText = (it.circuitBreakersToReset || []).length > 0;
    const hasImg = !!it.cbImage || (it.cbImages || []).length > 0;
    if (hasText || hasImg || !it.sourceRef) continue;

    let html;
    try {
      const res = await fetch(it.sourceRef, { signal: AbortSignal.timeout(25000) });
      html = await res.text();
    } catch (e) {
      console.log(`  ! fetch page failed ${it.faultTitle}: ${e.message}`);
      continue;
    }
    const srcs = contentImages(html);
    if (!srcs.length) continue;

    const rels = [];
    for (const src of srcs) {
      const absUrl = new URL(src, it.sourceRef).href;
      // Store mirroring the source's images/{ata}/{file} so shared images dedupe.
      const mrel = /\/images\/(\d+)\/([^/?#]+)$/i.exec(src);
      if (!mrel) continue;
      const [, ata, name] = mrel;
      const clean = cleanName(name);
      const relPath = `data/reset/images/${ata}/${clean}`;
      const destAbs = path.join(IMG_ROOT, ata, clean);
      try {
        if (!fs.existsSync(destAbs)) {
          const bytes = await download(absUrl, it.sourceRef, destAbs);
          console.log(`  + ${relPath} (${bytes}b)`);
        } else {
          console.log(`  = ${relPath} (exists)`);
        }
        rels.push(relPath);
        imgOk++;
      } catch (e) {
        console.log(`  x ${absUrl} -> ${e.message}`);
        imgFail++;
      }
    }
    if (rels.length) {
      it.cbImages = rels;
      dirty = true;
      patched++;
      console.log(`ATA${it.ataChapter}  ${it.faultTitle}  -> ${rels.length} img`);
    }
  }

  if (dirty) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n");
}

console.log(`\nDone. items patched=${patched}, images ok=${imgOk}, failed=${imgFail}`);
