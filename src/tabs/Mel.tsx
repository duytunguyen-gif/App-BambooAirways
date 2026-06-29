import { useEffect, useState } from "react";
import {
  MEL_RULES,
  computeDueDate,
  formatDate,
  melStatus,
  parseInputDate,
  toInputValue,
  todayUtc,
  type MelRule,
} from "../lib/mel";
import { parseNum } from "../lib/num";
import { load, save } from "../lib/storage";

interface MelState {
  defect: string; // yyyy-MM-dd
  customDays: string;
}

interface MelProps {
  excludeDayOfDiscovery: boolean;
}

function defaultState(): MelState {
  return { defect: toInputValue(todayUtc()), customDays: "" };
}

function utcClock(now: Date): { time: string; date: string } {
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    time: `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}`,
    date: formatDate(todayUtc(now)),
  };
}

export default function Mel({ excludeDayOfDiscovery }: MelProps) {
  const [s, setS] = useState<MelState>(() => load("mel", defaultState()));
  const [now, setNow] = useState<Date>(() => new Date());

  // Realtime UTC clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    save("mel", s);
  }, [s]);

  const defect = parseInputDate(s.defect);
  const customDays = parseNum(s.customDays);
  const clock = utcClock(now);

  const rules: MelRule[] = MEL_RULES.map((r) =>
    r.key === "A" ? { ...r, days: customDays > 0 ? customDays : null } : r
  );

  return (
    <div className="space-y-4">
      {/* Today UTC header (realtime) */}
      <div className="flex items-stretch gap-3">
        <div className="flex-1 rounded-2xl border border-warn-red/50 bg-warn-maroon px-4 py-3 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Today (UTC)
          </div>
          <div className="tabnums mt-1 text-2xl font-bold text-white">
            {clock.time} · {clock.date}
          </div>
        </div>
      </div>

      {/* Inputs: custom days (rule A) + defect date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute -top-2 left-3 z-10 bg-ink-900 px-1 text-[11px] font-medium text-gray-400">
            Custom Days (A)
          </span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Custom number of days for interval A"
            placeholder="e.g. 5"
            value={s.customDays}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                customDays: e.target.value.replace(/[^0-9]/g, ""),
              }))
            }
            className="tabnums h-12 w-full rounded-xl border border-line bg-ink-700 px-3 text-center text-lg font-semibold text-white placeholder:font-normal placeholder:text-gray-600 outline-none focus:border-bamboo-green focus:ring-2 focus:ring-bamboo-green/30"
          />
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute -top-2 left-3 z-10 bg-ink-900 px-1 text-[11px] font-medium text-gray-400">
            Defect / Apply Date
          </span>
          <input
            type="date"
            aria-label="Defect or apply date"
            value={s.defect}
            onChange={(e) => setS((p) => ({ ...p, defect: e.target.value }))}
            className="tabnums h-12 w-full rounded-xl border border-line bg-ink-700 px-3 text-center text-lg font-semibold text-white outline-none focus:border-bamboo-green focus:ring-2 focus:ring-bamboo-green/30 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Rule rows */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <RuleRow
            key={rule.key}
            rule={rule}
            defect={defect}
            now={now}
            exclude={excludeDayOfDiscovery}
          />
        ))}
      </div>

      {/* Calculation note */}
      <p className="text-center text-xs leading-relaxed text-gray-500">
        Due date = defect date + interval days
        {excludeDayOfDiscovery ? "" : " − 1"} · day of discovery{" "}
        {excludeDayOfDiscovery ? "excluded" : "counted"} (change in Settings).
        Dates in UTC, DD/MM/YYYY.
      </p>
    </div>
  );
}

function RuleRow({
  rule,
  defect,
  now,
  exclude,
}: {
  rule: MelRule;
  defect: Date | null;
  now: Date;
  exclude: boolean;
}) {
  const due =
    defect && rule.days != null ? computeDueDate(defect, rule.days, exclude) : null;
  const status = due ? melStatus(due, now) : null;

  const tone = status?.overdue
    ? "border-warn-red/70 bg-warn-red/15"
    : status?.within24h
      ? "border-warn-orange/70 bg-warn-orange/15"
      : "border-line bg-ink-800";

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3.5 ${tone}`}
    >
      <div>
        <div className="text-base font-semibold text-white">{rule.label}</div>
        {status && (
          <div className="mt-0.5 text-xs">
            {status.overdue ? (
              <span className="font-semibold text-warn-red">OVERDUE</span>
            ) : status.within24h ? (
              <span className="font-semibold text-warn-orange">
                Due within 24h
              </span>
            ) : (
              <span className="text-gray-500">{status.daysRemaining} days left</span>
            )}
          </div>
        )}
      </div>
      <div className="tabnums text-lg font-bold text-white">
        {due ? formatDate(due) : "—"}
      </div>
    </div>
  );
}
