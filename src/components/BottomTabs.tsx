export type TabKey = "fuelCalc" | "mel" | "caav" | "reset";

const TABS: { key: TabKey; label: string }[] = [
  { key: "fuelCalc", label: "Fuel Calc" },
  { key: "mel", label: "MEL" },
  { key: "caav", label: "CAAV" },
  { key: "reset", label: "ECAM+" },
];

interface BottomTabsProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

/** Fixed bottom navigation (top-level tabs), safe-area aware. */
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
              className={`flex min-h-[56px] flex-1 items-center justify-center px-1 text-center text-sm font-semibold leading-tight transition-colors ${
                isActive
                  ? "bg-bamboo-greenDark/60 text-white"
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
