import { useRef } from "react";
import { sanitizeNumeric } from "../lib/num";

interface NumberInputProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** Teal border + emphasis, used for Total / SUM cells. */
  total?: boolean;
  /** Red border + text, used for the Discrepancy when over threshold. */
  alert?: boolean;
  /** Green border + text, used for the Discrepancy when within threshold. */
  ok?: boolean;
  placeholder?: string;
  allowNegative?: boolean;
  className?: string;
  inputClassName?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Labeled numeric field with the label "notched" into the top border
 * (matches the reference mockups). Accepts numbers only.
 */
export default function NumberInput({
  label,
  value,
  onChange,
  readOnly = false,
  total = false,
  alert = false,
  ok = false,
  placeholder = "0",
  allowNegative = false,
  className = "",
  inputClassName = "",
  onFocus,
  onBlur,
}: NumberInputProps) {
  const border = alert
    ? "border-warn-red"
    : ok
      ? "border-bamboo-green"
      : total
        ? "border-teal-accent"
        : "border-line";

  const text = alert ? "text-warn-red" : ok ? "text-bamboo-green" : "text-white";

  const inputRef = useRef<HTMLInputElement>(null);

  // On mobile the on-screen keyboard covers the lower half of the screen; when
  // an editable cell gets focus, scroll it to the centre of the visible area so
  // it is never hidden behind the keyboard. Delayed so it runs after the
  // keyboard has finished animating in.
  const handleFocus = () => {
    onFocus?.();
    if (readOnly) return;
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  };

  return (
    <div className={`relative ${className}`}>
      <span
        className={`pointer-events-none absolute -top-2 left-3 z-10 bg-ink-900 px-1 text-[11px] font-medium leading-none ${
          alert ? "text-warn-red" : "text-gray-400"
        }`}
      >
        {label}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        aria-label={label}
        readOnly={readOnly}
        placeholder={placeholder}
        value={value}
        onFocus={handleFocus}
        onBlur={onBlur}
        onChange={(e) =>
          onChange?.(sanitizeNumeric(e.target.value, allowNegative))
        }
        className={`tabnums h-12 w-full rounded-xl border bg-ink-700 px-3 text-center text-lg font-semibold ${text} ${border} placeholder:font-normal placeholder:text-gray-600 outline-none transition-colors focus:border-bamboo-green focus:ring-2 focus:ring-bamboo-green/30 ${
          readOnly ? "cursor-default opacity-95" : ""
        } ${inputClassName}`}
      />
    </div>
  );
}
