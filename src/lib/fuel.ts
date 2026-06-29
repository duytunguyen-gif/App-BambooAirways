/**
 * Fuel calculations.
 *
 * Internal calculation aid only. Always verify with approved company
 * documents and procedures.
 */

export interface Triplet {
  left: number;
  center: number;
  right: number;
}

export interface Totaled extends Triplet {
  total: number;
}

export interface FuelCalcResult {
  remain: Totaled;
  uplift: Totaled;
  sum: Totaled;
  /** Browser Uplift - Total Uplift (scaled by the multiplier). */
  discrepancy: number;
  /** Allowed deviation = thresholdPercent% of |Total Uplift|. */
  limit: number;
  /** True when |discrepancy| reaches or exceeds the limit (>= limit). */
  exceedsThreshold: boolean;
}

function withTotal(t: Triplet): Totaled {
  return { ...t, total: t.left + t.center + t.right };
}

function scale(t: Triplet, factor: number): Triplet {
  return { left: t.left * factor, center: t.center * factor, right: t.right * factor };
}

/**
 * Fuel Calc tab.
 *
 * The user enters the REMAIN and SUM columns; UPLIFT is derived. The
 * multiplier (1 / 10 / 100) scales the entered REMAIN and SUM values (and so
 * the derived UPLIFT and all totals).
 *
 * - UPLIFT column     = SUM - REMAIN (per row)
 * - Total (per col)   = Left + Center + Right
 * - Discrepancy       = Browser Uplift - Total Uplift
 * - limit             = thresholdPercent% of |Total Uplift|
 * - exceedsThreshold  = |Discrepancy| >= limit  (red); below = ok (green)
 */
export function computeFuelCalc(
  remainRaw: Triplet,
  sumRaw: Triplet,
  browserUplift: number,
  thresholdPercent: number,
  multiplier: number
): FuelCalcResult {
  const factor = multiplier || 1;
  const remain = withTotal(scale(remainRaw, factor));
  const sum = withTotal(scale(sumRaw, factor));

  const uplift = withTotal({
    left: sum.left - remain.left,
    center: sum.center - remain.center,
    right: sum.right - remain.right,
  });

  const discrepancy = browserUplift - uplift.total;
  const limit = (Math.abs(thresholdPercent) / 100) * Math.abs(uplift.total);
  const exceedsThreshold = Math.abs(discrepancy) >= limit;

  return { remain, uplift, sum, discrepancy, limit, exceedsThreshold };
}

export interface FuelEstInput {
  taxi: number;
  trip: number;
  contingency: number;
  alternate: number;
  finalReserve: number;
  extra: number;
  remain: number;
}

export interface FuelEstResult {
  /** Sum of all required fuel components (excludes Remain on board). */
  blockFuel: number;
  /** Block Fuel - Remain, never negative. */
  fuelToUplift: number;
}

/**
 * Fuel Est tab.
 *
 * Block Fuel    = Taxi + Trip + Contingency + Alternate + Final Reserve + Extra
 * Fuel To Uplift = max(0, Block Fuel - Remain)
 */
export function computeFuelEst(input: FuelEstInput): FuelEstResult {
  const blockFuel =
    input.taxi +
    input.trip +
    input.contingency +
    input.alternate +
    input.finalReserve +
    input.extra;
  const fuelToUplift = Math.max(0, blockFuel - input.remain);
  return { blockFuel, fuelToUplift };
}
