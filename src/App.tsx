import { useEffect, useState } from "react";
import BottomTabs, { type TabKey } from "./components/BottomTabs";
import SettingsSheet from "./components/SettingsSheet";
import CafeModal from "./components/CafeModal";
import FuelCalc from "./tabs/FuelCalc";
import Mel from "./tabs/Mel";
import CaavTab from "./features/caav/CaavTab";
import { CAAV_STORAGE_KEYS } from "./features/caav/storage";
import ResetTab from "./features/reset/ResetTab";
import { RESET_STORAGE_KEYS } from "./features/reset/storage";
import { useKeyboardInsets } from "./lib/useKeyboardInsets";
import { load, remove, save } from "./lib/storage";

interface Settings {
  excludeDayOfDiscovery: boolean;
}
const DEFAULT_SETTINGS: Settings = { excludeDayOfDiscovery: true };

export default function App() {
  const [tab, setTab] = useState<TabKey>("fuelCalc");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cafeOpen, setCafeOpen] = useState(false);
  useKeyboardInsets();
  const [settings, setSettings] = useState<Settings>(() =>
    load("settings", DEFAULT_SETTINGS)
  );
  // Bumped to force tab state to reinitialize after "Reset all data".
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    save("settings", settings);
  }, [settings]);

  const resetAll = () => {
    [
      "fuelcalc",
      "fuelest",
      "mel",
      "settings",
      ...CAAV_STORAGE_KEYS,
      ...RESET_STORAGE_KEYS,
    ].forEach(remove);
    setSettings(DEFAULT_SETTINGS);
    setNonce((n) => n + 1);
  };

  return (
    <div className="app-bg relative flex min-h-dvh flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b border-line-soft bg-ink-900/90 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/bamboo-logo-mark.png"
              alt="Bamboo Airways"
              className="h-8 w-10 object-contain"
            />
            <h1 className="text-base font-bold text-white">
              BAV AMT Toolkit
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-300 hover:bg-ink-700 hover:text-white"
          >
            <GearIcon />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4">
        <div key={nonce}>
          {tab === "fuelCalc" && <FuelCalc />}
          {tab === "mel" && (
            <Mel excludeDayOfDiscovery={settings.excludeDayOfDiscovery} />
          )}
          {tab === "caav" && <CaavTab />}
          {tab === "reset" && <ResetTab />}
        </div>

        <footer className="mt-8 border-t border-line-soft pt-4 text-center text-[11px] leading-relaxed text-gray-500">
          Nếu công cụ này giúp ích cho anh em trong công việc, anh em có thể mời
          mình một ly cà phê{" "}
          <button
            type="button"
            onClick={() => setCafeOpen(true)}
            className="font-bold text-bamboo-green underline decoration-dotted underline-offset-2 hover:text-bamboo-green/80"
          >
            ở đây
          </button>
          . Mỗi sự ủng hộ của anh em — dù nhỏ — đều là nguồn động lực để mình tiếp
          tục duy trì, hoàn thiện và phát triển thêm nhiều công cụ thiết thực hơn
          cho công việc và học tập của anh em thợ máy chúng ta. Chân thành cảm ơn
          anh em! ☕
          <span className="mt-2 block text-gray-600">Designed by Duy Tú</span>
        </footer>
      </main>

      <BottomTabs active={tab} onChange={setTab} />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        excludeDayOfDiscovery={settings.excludeDayOfDiscovery}
        onExcludeChange={(v) =>
          setSettings((p) => ({ ...p, excludeDayOfDiscovery: v }))
        }
        onResetAll={resetAll}
      />

      <CafeModal open={cafeOpen} onClose={() => setCafeOpen(false)} />
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
