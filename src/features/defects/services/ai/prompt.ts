/** Pure prompt construction + response validation for the AI cleanup pass.
 *  No network here so it is fully unit-testable. */
import { z } from "zod";
import type { AiDefect, AiExtractInput } from "./types";

/** JSON schema handed to Gemini's `responseSchema` for structured output.
 *  Kept in sync with the zod validator below. */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    defects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          woNumber: { type: "string", nullable: true },
          defectIdRaw: { type: "string", nullable: true },
          shortTitle: { type: "string" },
          fullDescription: { type: "string" },
          currentDueDate: { type: "string", nullable: true },
          isConcession: { type: "boolean" },
          melReference: { type: "string", nullable: true },
          melCategory: { type: "string", nullable: true },
          limits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                limitType: { type: "string" },
                remainingText: { type: "string", nullable: true },
                dueDate: { type: "string", nullable: true },
              },
              required: ["limitType"],
            },
          },
        },
        required: ["shortTitle", "fullDescription", "isConcession", "limits"],
      },
    },
  },
  required: ["defects"],
} as const;

const nullableStr = z.string().nullable().optional().transform((v) => v ?? null);

const AiLimitSchema = z.object({
  limitType: z.string().optional().default("unknown"),
  remainingText: nullableStr,
  dueDate: nullableStr,
});

// Lenient on purpose: models occasionally omit derivable fields (e.g.
// shortTitle) or send a limit without a type. We keep whatever they give and
// backfill in the mapper rather than reject the whole report.
const AiDefectSchema = z.object({
  woNumber: nullableStr,
  defectIdRaw: nullableStr,
  shortTitle: z.string().optional().default(""),
  fullDescription: z.string().optional().default(""),
  currentDueDate: nullableStr,
  isConcession: z.boolean().optional().default(false),
  melReference: nullableStr,
  melCategory: nullableStr,
  limits: z.array(AiLimitSchema).optional().default([]),
});

const ResponseSchema = z.object({ defects: z.array(AiDefectSchema).optional().default([]) });

/** Derive a short title from a description's first line, ≤60 chars on a word
 *  boundary — mirrors the deterministic parser's makeShortTitle. */
function deriveShortTitle(fullDescription: string): string {
  const first = (fullDescription.split("\n")[0] || fullDescription).trim();
  if (first.length <= 60) return first;
  const cut = first.slice(0, 60);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut).trim();
}

export const SYSTEM_INSTRUCTION = [
  "You clean up aircraft maintenance defect data extracted from an AMOS",
  '"ADD B/C DEFECT LIST" PDF. The text was extracted by column position and is',
  "often garbled: one defect's statement can be split across columns, and text",
  "from the NEXT defect can bleed into the previous card.",
  "",
  "Your job: return one clean card PER DISTINCT REAL DEFECT. Rules:",
  "- Never merge two genuinely different defects into one card (different WO",
  "  numbers or clearly different problems = different cards).",
  "- Never split one defect into two.",
  "- A defect with several 'whichever comes first' limits (Day + FH + FC) is ONE",
  "  card with multiple limits.",
  "- fullDescription = the complete real defect statement, de-garbled, WITHOUT",
  "  text belonging to other defects and WITHOUT the Part Request sub-table.",
  "- currentDueDate: ISO yyyy-mm-dd. Convert dates like '15JULY2026',",
  "  '15.Jul.2026', '14/07/2026' to ISO. If no calendar due date exists, null.",
  "- isConcession = true only if the text contains '(Concession)'.",
  "- melReference like '25-50-01A', melCategory the CAT letter (A/B/C/D).",
  "- Preserve wording; translate nothing. Do not invent data — use null when",
  "  something is genuinely absent.",
  "Output MUST match the provided JSON schema exactly.",
].join("\n");

/** Build the user-turn content for one aircraft. */
export function buildUserPrompt(input: AiExtractInput): string {
  const draftLine =
    input.draft.length > 0
      ? JSON.stringify(
          input.draft.map((d) => ({
            woNumber: d.woNumber,
            shortTitle: d.shortTitle,
          }))
        )
      : "[]";
  const countHint =
    input.expectedOpenCount != null
      ? `The PDF header says this aircraft has ${input.expectedOpenCount} open anchor rows (a multi-limit defect uses several rows, so the number of CARDS may be lower).`
      : "The open-defect count for this aircraft is unknown.";
  return [
    `Aircraft: ${input.registration}  (ADD category ${input.category})`,
    countHint,
    "",
    "Deterministic draft cards (WO + title only, may be wrong — for reference):",
    draftLine,
    "",
    "Raw extracted text for this aircraft (source of truth):",
    "```",
    input.rawText,
    "```",
  ].join("\n");
}

/** Parse + validate a raw JSON string from the model into AiDefect[]. Throws on
 *  malformed output. `registration`/`category` are stamped from the input since
 *  the model output omits them. */
export function parseAiResponse(
  jsonText: string,
  registration: string,
  category: AiDefect["category"]
): AiDefect[] {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    // Some models wrap JSON in ```json fences despite JSON mode — strip and retry.
    const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced) throw new Error("AI trả về không phải JSON hợp lệ.");
    data = JSON.parse(fenced[1]);
  }
  const parsed = ResponseSchema.parse(data);
  return parsed.defects
    // Drop empty shells (no title AND no description) the model sometimes emits.
    .filter((d) => (d.shortTitle || d.fullDescription).trim().length > 0)
    .map((d) => ({
      ...d,
      shortTitle: d.shortTitle.trim() || deriveShortTitle(d.fullDescription),
      fullDescription: d.fullDescription.trim() || d.shortTitle.trim(),
      registration,
      category,
    }));
}
