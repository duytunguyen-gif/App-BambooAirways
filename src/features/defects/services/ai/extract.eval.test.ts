/** LIVE eval — hits the real AI provider on the committed sample fixtures so you
 *  can judge AI cleanup quality on real AMOS data before wiring the pipeline.
 *
 *  It is SKIPPED unless an API key is set, so CI / normal `vitest run` never
 *  makes a network call. Uses getAiProvider(env), so it runs whichever provider
 *  is configured. To run it (PowerShell):
 *      $env:AI_PROVIDER="openai"; $env:OPENAI_API_KEY="sk-..."; npx vitest run extract.eval
 *      # or Gemini:
 *      $env:AI_PROVIDER="gemini"; $env:GEMINI_API_KEY="AIza..."; npx vitest run extract.eval
 *  Optionally set $env:AI_MODEL (default gpt-4o-mini / gemini-2.5-flash).
 *
 *  This only READS the fixtures and prints a comparison; it writes nothing.  */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDefects, buildAircraftSections } from "../../parser/parseDefects";
import type { RawTextItem } from "../../parser/types";
import { getAiProvider } from "./index";
import { parsedToAiDefect } from "./draftAdapter";

const provider = getAiProvider(process.env as any);

function loadFixture(name: string): { items: RawTextItem[]; pageCount: number } {
  const p = resolve(__dirname, "../../parser/__fixtures__", `${name}.items.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}

describe.skipIf(!provider.available)(`LIVE ${provider.name} eval on sample B`, () => {
  it(
    "cleans each aircraft and prints draft-vs-AI",
    async () => {
      const fx = loadFixture("b");
      const report = parseDefects(fx.items, fx.pageCount);
      const sections = buildAircraftSections(fx.items);

      let totalTokens = 0;
      for (const section of sections) {
        const ac = report.aircraft.find((a) => a.registration === section.registration);
        const draft = (ac?.defects ?? []).map(parsedToAiDefect);
        const res = await provider.extract({
          registration: section.registration,
          category: report.category,
          expectedOpenCount: section.expectedOpenCount,
          rawText: section.rawText,
          draft,
        });
        totalTokens += res.usedTokens ?? 0;

        console.log(
          `\n### ${section.registration}  header=${section.expectedOpenCount}  ` +
            `parser=${draft.length} cards  AI=${res.defects.length} cards  ` +
            `(${res.ok ? "ok" : "FAIL: " + res.message})`
        );
        if (!res.ok) continue;
        for (const d of res.defects) {
          console.log(
            `  · WO ${d.woNumber ?? "—"}  due=${d.currentDueDate ?? "—"}` +
              `${d.isConcession ? " [CONC]" : ""}  ${d.shortTitle}`
          );
        }
        expect(res.defects.length).toBeGreaterThan(0);
      }
      console.log(`\nProvider=${provider.name}  TOTAL tokens billed ≈ ${totalTokens}`);
    },
    180_000
  );
});
