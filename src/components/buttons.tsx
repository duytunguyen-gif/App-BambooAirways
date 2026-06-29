import type { ButtonHTMLAttributes } from "react";

type Variant = "delta" | "reset" | "toggle" | "neutral";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  active?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  delta:
    "bg-bamboo-greenDark text-white border border-bamboo-green/40 hover:bg-bamboo-greenAccent",
  reset: "bg-warn-orange text-white hover:brightness-110",
  neutral: "bg-ink-700 text-gray-300 border border-line hover:bg-ink-600",
  toggle: "", // resolved via `active`
};

/** Shared button with min 44pt touch target and clear press feedback. */
export default function ActionButton({
  variant = "neutral",
  active = false,
  className = "",
  children,
  ...rest
}: ActionButtonProps) {
  const toggleStyle =
    variant === "toggle"
      ? active
        ? "bg-bamboo-greenAccent text-white"
        : "bg-ink-700 text-gray-400 border border-line"
      : "";

  return (
    <button
      type="button"
      className={`min-h-[44px] select-none rounded-xl px-4 font-semibold transition-all active:scale-[0.97] ${VARIANTS[variant]} ${toggleStyle} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
