/** Zod schemas for the ECAM Reset+ data. Used by:
 *   - the in-app admin editor / import preview (validate before accepting),
 *   - scripts/validate_reset.mjs (validate the seed files in CI-ish fashion).
 *
 *  Kept in sync with types.ts. The runtime schema is the single source of
 *  validation truth; the TS interfaces are for editor ergonomics. */
import { z } from "zod";
import type { ResetFaultItem } from "./types";

export const verifiedStatusSchema = z.enum([
  "verified",
  "pending",
  "needs_review",
]);

export const circuitBreakerSchema = z.object({
  label: z.string().min(1, "CB label không được rỗng"),
  panel: z.string().min(1, "CB panel không được rỗng"),
  number: z.string().min(1, "CB number không được rỗng"),
  note: z.string().optional(),
});

export const resetResultsSchema = z.object({
  pass: z.string().optional(),
  fail: z.string().optional(),
});

/** A fault item. faultTitle + ataChapter are the only hard requirements
 *  (matches the "không cho import record thiếu faultTitle/ataChapter" rule). */
export const resetFaultItemSchema = z.object({
  id: z.string().min(1),
  aircraftType: z.string().min(1).default("A320 Family"),
  ataChapter: z.string().min(1, "Thiếu ataChapter"),
  ataTitle: z.string().default(""),
  faultTitle: z.string().min(1, "Thiếu faultTitle"),
  system: z.string().optional(),
  aircraftConfigurationPriorToReset: z.array(z.string()).default([]),
  circuitBreakersToReset: z.array(circuitBreakerSchema).default([]),
  cbImage: z.string().optional(),
  cbImages: z.array(z.string()).optional(),
  cbText: z.string().optional(),
  stepsToClearWarning: z.array(z.string()).default([]),
  resetDuration: z.string().optional(),
  results: resetResultsSchema.default({}),
  notes: z.array(z.string()).optional(),
  signOffRefs: z.array(z.string()).optional(),
  applicableDeferrals: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  sourceRef: z.string().optional(),
  revision: z.string().optional(),
  effectiveDate: z.string().optional(),
  verifiedStatus: verifiedStatusSchema.default("pending"),
  verifiedBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const chapterFileSchema = z.object({
  ataNumber: z.string().min(1),
  ataTitle: z.string(),
  items: z.array(resetFaultItemSchema),
});

export const ataChapterMetaSchema = z.object({
  ataNumber: z.string().min(1),
  ataTitle: z.string(),
  description: z.string().optional(),
  sortOrder: z.number(),
  count: z.number(),
  verifiedCount: z.number(),
  pendingCount: z.number(),
});

export const resetIndexSchema = z.object({
  aircraftType: z.string(),
  generatedAt: z.string(),
  totalItems: z.number(),
  chapters: z.array(ataChapterMetaSchema),
});

export interface ValidationResult {
  ok: boolean;
  /** Parsed + defaulted item when ok. */
  value?: ResetFaultItem;
  /** Human-readable messages, e.g. "faultTitle: Thiếu faultTitle". */
  errors: string[];
}

/** Validate one raw fault item. Returns friendly Vietnamese error paths so the
 *  admin import preview can show exactly what's wrong per record. */
export function validateFaultItem(raw: unknown): ValidationResult {
  const parsed = resetFaultItemSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, value: parsed.data as ResetFaultItem, errors: [] };
  }
  const errors = parsed.error.issues.map((i) => {
    const path = i.path.join(".") || "(record)";
    return `${path}: ${i.message}`;
  });
  return { ok: false, errors };
}

/** Validate an array of raw items (an import batch). */
export function validateFaultItems(rawList: unknown): {
  ok: boolean;
  valid: ResetFaultItem[];
  invalid: { index: number; errors: string[] }[];
} {
  if (!Array.isArray(rawList)) {
    return {
      ok: false,
      valid: [],
      invalid: [{ index: -1, errors: ["Dữ liệu import phải là một mảng (array)."] }],
    };
  }
  const valid: ResetFaultItem[] = [];
  const invalid: { index: number; errors: string[] }[] = [];
  rawList.forEach((raw, index) => {
    const r = validateFaultItem(raw);
    if (r.ok && r.value) valid.push(r.value);
    else invalid.push({ index, errors: r.errors });
  });
  return { ok: invalid.length === 0, valid, invalid };
}
