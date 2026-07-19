/** A `DefectsSource` backed by the committed parser fixtures, parsed in the
 *  browser. It lets the viewer UI be developed and previewed before any Supabase
 *  project is configured, and gives testers realistic data. The fixtures are
 *  loaded via dynamic import so they are code-split and never weigh down the
 *  main bundle for users on the live (Supabase-backed) data path. */
import type { RawTextItem } from "../../parser/types";
import { parseDefects } from "../../parser/parseDefects";
import { reportToDefects } from "../mapper";
import type { CategorySnapshot, DefectsSnapshot, DefectsSource } from "./types";

interface Fixture {
  items: RawTextItem[];
  pageCount: number;
}

async function loadCategory(
  which: "b" | "c",
  category: "B" | "C"
): Promise<CategorySnapshot> {
  const mod =
    which === "b"
      ? await import("../../parser/__fixtures__/b.items.json")
      : await import("../../parser/__fixtures__/c.items.json");
  const fx = (mod.default ?? mod) as unknown as Fixture;
  const report = parseDefects(fx.items, fx.pageCount);
  return {
    category,
    reportGeneratedAt: report.reportGeneratedAt,
    defects: reportToDefects(report),
  };
}

export const demoSource: DefectsSource = {
  name: "demo",
  async getSnapshot(): Promise<DefectsSnapshot> {
    const [b, c] = await Promise.all([
      loadCategory("b", "B"),
      loadCategory("c", "C"),
    ]);
    return { B: b, C: c, fetchedAt: new Date().toISOString() };
  },
};
