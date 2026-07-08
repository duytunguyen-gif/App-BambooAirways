import { useEffect } from "react";

/**
 * Detects the mobile on-screen keyboard via `window.visualViewport` and, while
 * it is open, adds a `keyboard-open` class + a `--keyboard-offset` CSS variable
 * on <html>. CSS uses these to add extra padding-bottom so the focused input can
 * scroll clear of the keyboard. No-op on desktop / browsers without visualViewport.
 */
export function useKeyboardInsets(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;

    const update = () => {
      // Space hidden behind the keyboard = layout viewport − visual viewport.
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // 120px guard avoids false positives from browser toolbars collapsing.
      if (offset > 120) {
        root.classList.add("keyboard-open");
        root.style.setProperty("--keyboard-offset", `${Math.round(offset)}px`);
      } else {
        root.classList.remove("keyboard-open");
        root.style.removeProperty("--keyboard-offset");
      }
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.classList.remove("keyboard-open");
      root.style.removeProperty("--keyboard-offset");
    };
  }, []);
}
