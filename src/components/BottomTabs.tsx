export type TabKey = "fuelCalc" | "mel" | "defects" | "ecam" | "more";

const TABS: { key: TabKey; label: string }[] = [
  { key: "fuelCalc", label: "Fuel Calc" },
  { key: "mel", label: "MEL" },
  { key: "defects", label: "Defects" },
  { key: "ecam", label: "ECAM+" },
  { key: "more", label: "More" },
];

interface BottomTabsProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

/** Fixed bottom navigation (top-level tabs), safe-area aware.
 *  Five tabs: kept on one row on small screens via text-xs + tight padding
 *  while preserving a ≥56px touch target and the bottom safe-area inset. */
export default function BottomTabs({ active, onChange }: BottomTabsProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-ink-900/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(tab.key)}
              className={`flex min-h-[56px] flex-1 items-center justify-center px-0.5 text-center text-xs font-semibold leading-tight transition-colors ${
                isActive
                  ? "bg-sel text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
