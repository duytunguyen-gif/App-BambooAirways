/** UI-only mapping from the domain `Severity` to Tailwind accent classes.
 *  Spec §7E: severity drives the left border, badge and text accent ONLY — never
 *  a filled card background. Concession is a separate visual dimension (purple
 *  badge), independent of due-date severity. */
import type { Severity } from "../model";

interface SeverityStyle {
  /** Left border of the card. */
  border: string;
  /** Badge background + text (subtle, not a full fill). */
  badge: string;
  /** Inline text accent (e.g. the days-left figure). */
  text: string;
  /** Short Vietnamese label for the badge when no explicit due text is shown. */
  label: string;
}

export const SEVERITY_STYLE: Record<Severity, SeverityStyle> = {
  red: {
    border: "border-l-warn-red",
    badge: "bg-warn-red/15 text-red-300 ring-1 ring-inset ring-warn-red/40",
    text: "text-red-300",
    label: "Quá hạn",
  },
  orange: {
    border: "border-l-orange-500",
    badge: "bg-orange-500/15 text-orange-300 ring-1 ring-inset ring-orange-500/40",
    text: "text-orange-300",
    label: "Sắp hạn",
  },
  amber: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/40",
    text: "text-amber-300",
    label: "Trong 30 ngày",
  },
  gray: {
    border: "border-l-line",
    badge: "bg-ink-700 text-gray-300 ring-1 ring-inset ring-line",
    text: "text-gray-300",
    label: "Không hạn lịch",
  },
};

/** Purple concession badge classes (a separate dimension from severity). */
export const CONCESSION_BADGE =
  "bg-purple-500/15 text-purple-300 ring-1 ring-inset ring-purple-500/40";
