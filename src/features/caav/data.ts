/** Loads the CAAV JSON data (index + per-bank question files) with in-memory
 *  caching so a bank is only fetched once per session. Files are static assets
 *  under public/data/caav/ — no backend needed. */
import type { BankMeta, CaavIndex, Question } from "./types";

const BASE = `${import.meta.env.BASE_URL}data/caav/`;

let indexPromise: Promise<CaavIndex> | null = null;
const bankPromises = new Map<string, Promise<Question[]>>();

export function loadIndex(): Promise<CaavIndex> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}index.json`).then((r) => {
      if (!r.ok) throw new Error(`Không tải được danh mục CAAV (${r.status})`);
      return r.json();
    });
  }
  return indexPromise;
}

export function loadBank(slug: string): Promise<Question[]> {
  let p = bankPromises.get(slug);
  if (!p) {
    p = fetch(`${BASE}${slug}.json`).then((r) => {
      if (!r.ok) throw new Error(`Không tải được bộ đề "${slug}" (${r.status})`);
      return r.json();
    });
    bankPromises.set(slug, p);
  }
  return p;
}

/** Load several banks and return their questions concatenated (order preserved).
 *  Uses the per-bank cache, so repeated scopes are cheap. */
export async function loadBanks(slugs: string[]): Promise<Question[]> {
  const parts = await Promise.all(slugs.map(loadBank));
  return parts.flat();
}

/** Friendly display title for a bank, e.g. "A320 Airframe — CAT A". */
export function bankTitle(m: BankMeta): string {
  if (m.sectionType === "LAW") return "Aviation Legislation (Luật HK)";
  if (m.sectionType === "English") return "Aviation Technical English";
  const subject = m.engineType
    ? `${m.engineType} Engine`
    : `${m.aircraftType ?? ""} Airframe`.trim();
  return m.cat ? `${subject} — ${m.cat}` : subject;
}

/** Short subtitle describing the source. */
export function bankSubtitle(m: BankMeta): string {
  if (m.sectionType === "LAW") return "Dùng chung mọi CRS · phần LAW khi thi thử";
  if (m.sectionType === "English") return "Dùng chung mọi CRS";
  return m.engineType ? "Động cơ" : "Khung máy bay (Airframe)";
}
