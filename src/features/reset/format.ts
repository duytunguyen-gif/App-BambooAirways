/** Plain-text formatters for the copy buttons. Pure functions — no DOM. */
import type { CircuitBreaker, ResetFaultItem } from "./types";

/** Format the circuit-breaker table as aligned monospace-ish text. */
export function formatCircuitBreakers(cbs: readonly CircuitBreaker[]): string {
  if (cbs.length === 0) return "(no circuit breakers listed)";
  const rows = cbs.map((c) => {
    const base = `${c.label} | ${c.panel} | ${c.number}`;
    return c.note ? `${base} | ${c.note}` : base;
  });
  return ["LABEL | PANEL | NUMBER", ...rows].join("\n");
}

/** Format a whole fault procedure for "Copy full procedure". */
export function formatFullProcedure(item: ResetFaultItem): string {
  const L: string[] = [];
  L.push(item.faultTitle);
  L.push(`ATA ${item.ataChapter} — ${item.ataTitle}${item.system ? ` · ${item.system}` : ""}`);
  L.push(`Aircraft: ${item.aircraftType}`);
  L.push(`Status: ${item.verifiedStatus.toUpperCase()}`);
  L.push("");

  if (item.aircraftConfigurationPriorToReset.length) {
    L.push("Aircraft configuration prior to reset:");
    item.aircraftConfigurationPriorToReset.forEach((s) => L.push(`- ${s}`));
    L.push("");
  }
  if (item.circuitBreakersToReset.length) {
    L.push("Circuit breakers to reset:");
    L.push(formatCircuitBreakers(item.circuitBreakersToReset));
    L.push("");
  }
  if (item.stepsToClearWarning.length) {
    L.push("Steps to clear warning:");
    item.stepsToClearWarning.forEach((s, i) => L.push(`${i + 1}. ${s}`));
    L.push("");
  }
  if (item.resetDuration) {
    L.push(`Reset duration: ${item.resetDuration}`);
    L.push("");
  }
  if (item.results.pass || item.results.fail) {
    L.push("Results of power up test or reset:");
    if (item.results.pass) L.push(`- Pass: ${item.results.pass}`);
    if (item.results.fail) L.push(`- Fail: ${item.results.fail}`);
    L.push("");
  }
  if (item.notes?.length) {
    L.push("Notes:");
    item.notes.forEach((s) => L.push(`- ${s}`));
    L.push("");
  }
  if (item.signOffRefs?.length) {
    L.push("Sign off / Reference:");
    item.signOffRefs.forEach((s) => L.push(`- ${s}`));
    L.push("");
  }
  if (item.applicableDeferrals?.length) {
    L.push("Applicable deferrals:");
    item.applicableDeferrals.forEach((s) => L.push(`- ${s}`));
    L.push("");
  }
  L.push("— Internal training/reference only. Verify with approved AMM/MEL/TSM.");
  return L.join("\n").trim();
}
