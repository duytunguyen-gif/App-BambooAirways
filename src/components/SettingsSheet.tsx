import Toggle from "./Toggle";
import ActionButton from "./buttons";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  excludeDayOfDiscovery: boolean;
  onExcludeChange: (value: boolean) => void;
  onResetAll: () => void;
}

/** Bottom sheet for app settings + PWA install instructions. */
export default function SettingsSheet({
  open,
  onClose,
  excludeDayOfDiscovery,
  onExcludeChange,
  onResetAll,
}: SettingsSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-line bg-ink-800 p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-lg px-3 text-sm font-semibold text-gray-400 hover:text-white"
          >
            Done
          </button>
        </div>

        <section className="rounded-xl border border-line-soft bg-ink-700 p-4">
          <Toggle
            checked={excludeDayOfDiscovery}
            onChange={onExcludeChange}
            label="Exclude day of discovery"
            hint={
              excludeDayOfDiscovery
                ? "Due date = defect date + interval days (day of discovery not counted)."
                : "Due date = defect date + interval days − 1 (day of discovery counts as day 1)."
            }
          />
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
            Install on your phone
          </h3>
          <div className="space-y-3 rounded-xl border border-line-soft bg-ink-700 p-4 text-sm text-gray-300">
            <p>
              <span className="font-semibold text-accent-green">Android (Chrome):</span>{" "}
              tap the <span className="font-semibold">⋮</span> menu →{" "}
              <span className="font-semibold">Add to Home screen</span>.
            </p>
            <p>
              <span className="font-semibold text-accent-green">iOS (Safari):</span>{" "}
              tap <span className="font-semibold">Share</span> →{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          </div>
        </section>

        <section className="mt-5">
          <ActionButton
            variant="reset"
            onClick={() => {
              onResetAll();
              onClose();
            }}
            className="w-full"
          >
            Reset all data
          </ActionButton>
        </section>

        <p className="mt-5 text-center text-xs leading-relaxed text-gray-500">
          Internal calculation aid only. Always verify with approved company
          documents and procedures.
        </p>
      </div>
    </div>
  );
}
