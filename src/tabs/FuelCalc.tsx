import { useEffect, useState } from "react";
import NumberInput from "../components/NumberInput";
import ActionButton from "../components/buttons";
import { computeFuelCalc, type Triplet } from "../lib/fuel";
import { fmt, parseNum } from "../lib/num";
import { load, save } from "../lib/storage";

type Row = "left" | "center" | "right";
type StrTriplet = Record<Row, string>;

interface FuelCalcState {
  /** Multiplier applied to entered REMAIN and SUM: 1, 10 or 100. */
  mult: number;
  threshold: string;
  remain: StrTriplet;
  sum: StrTriplet;
  browserUplift: string;
}

const EMPTY: StrTriplet = { left: "", center: "", right: "" };
const DEFAULT: FuelCalcState = {
  mult: 1,
  threshold: "2.0",
  remain: { ...EMPTY },
  sum: { ...EMPTY },
  browserUplift: "",
};

const MULTS = [1, 10, 100];
const nextMult = (m: number) => MULTS[(MULTS.indexOf(m) + 1) % MULTS.length] ?? 1;

const toNum = (t: StrTriplet): Triplet => ({
  left: parseNum(t.left),
  center: parseNum(t.center),
  right: parseNum(t.right),
});

const ROWS: { key: Row; label: string }[] = [
  { key: "left", label: "Left" },
  { key: "center", label: "Center" },
  { key: "right", label: "Right" },
];

export default function FuelCalc() {
  const [s, setS] = useState<FuelCalcState>(() => load("fuelcalc", DEFAULT));
  const [committed, setCommitted] = useState(false);
  // While a REMAIN/SUM cell is focused we show the raw entry; once the user
  // moves on, the cell displays the value already multiplied (x10 / x100) so
  // the grid reads as the real figures.
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    save("fuelcalc", s);
  }, [s]);

  const result = computeFuelCalc(
    toNum(s.remain),
    toNum(s.sum),
    parseNum(s.browserUplift),
    parseNum(s.threshold),
    s.mult
  );

  const hasBrowser = s.browserUplift.trim() !== "";
  const showVerdict = committed && hasBrowser;

  const setCell = (col: "remain" | "sum", row: Row, value: string) =>
    setS((p) => ({ ...p, [col]: { ...p[col], [row]: value } }));

  // Display value for an editable REMAIN/SUM cell: raw while focused,
  // multiplied otherwise.
  const cellValue = (col: "remain" | "sum", row: Row) => {
    const raw = s[col][row];
    const key = `${col}.${row}`;
    if (focused === key) return raw;
    return raw.trim() === "" ? "" : fmt(parseNum(raw) * (s.mult || 1));
  };

  const reset = () => {
    setS({ ...DEFAULT, threshold: s.threshold, mult: s.mult });
    setCommitted(false);
  };

  return (
    <div className="space-y-4">
      {/* Top controls: multiplier (x1/x10/x100), Threshold, Trim (placeholder) */}
      <div className="grid grid-cols-3 items-center gap-3">
        <ActionButton
          variant="toggle"
          active={s.mult > 1}
          aria-label={`Multiplier x${s.mult}, tap to change`}
          onClick={() => setS((p) => ({ ...p, mult: nextMult(p.mult) }))}
          className="h-12"
        >
          x{s.mult}
        </ActionButton>
        <NumberInput
          label="Threshold %"
          value={s.threshold}
          onChange={(v) => setS((p) => ({ ...p, threshold: v }))}
        />
        <button
          type="button"
          disabled
          title="Reserved"
          className="h-12 cursor-not-allowed rounded-xl border border-line bg-ink-700 font-semibold text-gray-600"
        >
          Trim
        </button>
      </div>

      {/* Column headers (UPLIFT is auto-calculated) */}
      <div className="grid grid-cols-3 gap-3 text-center font-bold tracking-wide text-white">
        <div className="text-xl">REMAIN</div>
        <div>
          <div className="text-xl">UPLIFT</div>
          <div className="text-[10px] font-medium uppercase text-accent-green">
            auto
          </div>
        </div>
        <div className="text-xl">SUM</div>
      </div>

      {/* Grid: Left / Center / Right */}
      <div className="space-y-3">
        {ROWS.map((r) => (
          <div key={r.key} className="grid grid-cols-3 gap-3">
            <NumberInput
              label={r.label}
              value={cellValue("remain", r.key)}
              onChange={(v) => setCell("remain", r.key, v)}
              onFocus={() => setFocused(`remain.${r.key}`)}
              onBlur={() => setFocused(null)}
            />
            <NumberInput
              label={r.label}
              readOnly
              value={fmt(result.uplift[r.key])}
            />
            <NumberInput
              label={r.label}
              value={cellValue("sum", r.key)}
              onChange={(v) => setCell("sum", r.key, v)}
              onFocus={() => setFocused(`sum.${r.key}`)}
              onBlur={() => setFocused(null)}
            />
          </div>
        ))}

        {/* Total row */}
        <div className="grid grid-cols-3 gap-3">
          <NumberInput label="Total" total readOnly value={fmt(result.remain.total)} />
          <NumberInput label="Total" total readOnly value={fmt(result.uplift.total)} />
          <NumberInput label="Total" total readOnly value={fmt(result.sum.total)} />
        </div>
      </div>

      {/* Browser uplift comparison + actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-3">
          <NumberInput
            label="Browser Uplift"
            value={s.browserUplift}
            onChange={(v) => setS((p) => ({ ...p, browserUplift: v }))}
          />
          <NumberInput
            label="Total Uplift"
            readOnly
            value={fmt(result.uplift.total)}
          />
          <NumberInput
            label="Discrepancy"
            readOnly
            alert={showVerdict && result.exceedsThreshold}
            ok={showVerdict && !result.exceedsThreshold}
            value={hasBrowser ? fmt(result.discrepancy) : ""}
          />
        </div>

        <div className="flex flex-col gap-3">
          <ActionButton variant="reset" onClick={reset} className="h-14 text-lg">
            Reset
          </ActionButton>
          <ActionButton
            variant="delta"
            onClick={() => setCommitted(true)}
            className="h-28 text-2xl"
          >
            Delta
          </ActionButton>
        </div>
      </div>

      {/* Verdict: discrepancy vs. threshold% of Total Uplift */}
      {showVerdict &&
        (result.exceedsThreshold ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-warn-red/60 bg-warn-red/15 px-4 py-3 text-sm font-semibold text-accent-red"
          >
            <WarningIcon />
            Discrepancy {fmt(result.discrepancy)} ≥ {fmt(parseNum(s.threshold))}%
            limit (±{fmt(result.limit, 2)}). Re-check fuel figures.
          </div>
        ) : (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-bamboo-green/60 bg-bamboo-green/15 px-4 py-3 text-sm font-semibold text-accent-green"
          >
            <CheckIcon />
            Discrepancy {fmt(result.discrepancy)} within {fmt(parseNum(s.threshold))}%
            limit (±{fmt(result.limit, 2)}). OK.
          </div>
        ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
