/** Adapt deterministic ParsedDefect cards into the leaner AiDefect shape used as
 *  the AI hint / the `none`-provider passthrough. Kept separate so the AI layer
 *  never imports the full parser model beyond its types. */
import type { ParsedDefect } from "../../parser/types";
import type { AiDefect } from "./types";

export function parsedToAiDefect(d: ParsedDefect): AiDefect {
  return {
    registration: d.registration,
    category: d.category,
    woNumber: d.woNumber,
    defectIdRaw: d.defectIdRaw,
    shortTitle: d.shortTitle,
    fullDescription: d.fullDescription,
    currentDueDate: d.currentDueDate,
    isConcession: d.isConcession,
    melReference: d.melReference,
    melCategory: d.melCategory,
    limits: d.limits.map((l) => ({
      limitType: l.limitType,
      remainingText: l.remainingText,
      dueDate: l.dueDate,
    })),
  };
}
