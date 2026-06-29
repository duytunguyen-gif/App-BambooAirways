import { useEffect, useState } from "react";
import NumberInput from "../components/NumberInput";
import ActionButton from "../components/buttons";
import { computeFuelEst, type FuelEstInput } from "../lib/fuel";
import { fmt, parseNum } from "../lib/num";
import { load, save } from "../lib/storage";

type Field = keyof FuelEstInput;
type FuelEstStrings = Record<Field, string>;

const DEFAULT: FuelEstStrings = {
  taxi: "",
  trip: "",
  contingency: "",
  alternate: "",
  finalReserve: "",
  extra: "",
  remain: "",
};

const FIELDS: { key: Field; label: string }[] = [
  { key: "taxi", label: "Taxi Fuel" },
  { key: "trip", label: "Trip Fuel" },
  { key: "contingency", label: "Contingency" },
  { key: "alternate", label: "Alternate" },
  { key: "finalReserve", label: "Final Reserve" },
  { key: "extra", label: "Extra Fuel" },
];

export default function FuelEst() {
  const [s, setS] = useState<FuelEstStrings>(() => load("fuelest", DEFAULT));

  useEffect(() => {
    save("fuelest", s);
  }, [s]);

  const input: FuelEstInput = {
    taxi: parseNum(s.taxi),
    trip: parseNum(s.trip),
    contingency: parseNum(s.contingency),
    alternate: parseNum(s.alternate),
    finalReserve: parseNum(s.finalReserve),
    extra: parseNum(s.extra),
    remain: parseNum(s.remain),
  };
  const { blockFuel, fuelToUplift } = computeFuelEst(input);

  const set = (key: Field, value: string) =>
    setS((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Fuel Estimate</h2>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <NumberInput
            key={f.key}
            label={f.label}
            value={s[f.key]}
            onChange={(v) => set(f.key, v)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-line bg-ink-800 p-4">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-400">Block Fuel</span>
          <span className="tabnums text-xl font-bold text-white">
            {fmt(blockFuel)}
          </span>
        </div>
        <div className="my-2 border-t border-line-soft" />
        <NumberInput label="Remain Fuel" value={s.remain} onChange={(v) => set("remain", v)} />
        <div className="mt-3 flex items-center justify-between rounded-lg bg-bamboo-greenDark/40 px-3 py-3">
          <span className="text-sm font-semibold text-bamboo-green">
            Fuel To Uplift
          </span>
          <span className="tabnums text-2xl font-extrabold text-white">
            {fmt(fuelToUplift)}
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <ActionButton variant="reset" onClick={() => setS(DEFAULT)} className="px-6">
          Reset
        </ActionButton>
      </div>

      <p className="text-center text-xs italic text-gray-500">
        For reference only — follow company approved procedures.
      </p>
    </div>
  );
}
