/**
 * Numeric input helpers. The UI keeps raw strings so users can type freely
 * (including a leading "-", decimal point, or empty field); calculations use
 * the parsed value.
 */

/** Parse a user-entered string to a number. Empty/invalid -> 0. */
export function parseNum(value: string): number {
  if (value == null) return 0;
  const trimmed = String(value).trim().replace(",", ".");
  if (trimmed === "" || trimmed === "-" || trimmed === ".") return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Keep only characters valid in a (optionally signed) decimal number.
 * Used by NumberInput so the field accepts numbers only.
 */
export function sanitizeNumeric(value: string, allowNegative = false): string {
  let v = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  // collapse to a single decimal point
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  // handle minus sign
  if (allowNegative) {
    const negative = v.startsWith("-");
    v = (negative ? "-" : "") + v.replace(/-/g, "");
  } else {
    v = v.replace(/-/g, "");
  }
  return v;
}

/** Format a number for display, trimming trailing zeros (max `digits`). */
export function fmt(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}
