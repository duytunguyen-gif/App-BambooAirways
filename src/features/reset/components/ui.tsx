/** Shared UI atoms for the ECAM Reset+ feature (dark theme, matches the app). */
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { VerifiedStatus } from "../types";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-bamboo-green" />
      {label && <div className="text-sm">{label}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-warn-red/50 bg-warn-red/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}

export function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-line-soft bg-ink-800 px-4 py-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

/** Back header shown at the top of every non-home screen. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-soft text-gray-300 hover:bg-ink-700 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold leading-tight text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** Verified / Pending / Needs-review pill. Colors match the MEL warning palette. */
export function VerifiedBadge({ status }: { status: VerifiedStatus }) {
  const map: Record<VerifiedStatus, { label: string; cls: string }> = {
    verified: {
      label: "Verified",
      cls: "border-bamboo-green/50 bg-bamboo-green/15 text-bamboo-green",
    },
    pending: {
      label: "Pending verification",
      cls: "border-warn-orange/50 bg-warn-orange/15 text-amber-300",
    },
    needs_review: {
      label: "Needs review",
      cls: "border-warn-red/50 bg-warn-red/15 text-red-300",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status === "verified" ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      )}
      {label}
    </span>
  );
}

/** Copy text to clipboard with a graceful fallback + a short "Đã copy" state. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    writeClipboard(text).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, []);
  return [copied, copy];
}

/** A compact copy button with an icon + optional label. */
export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-ink-700 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-ink-600 ${className}`}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-bamboo-green"><path d="M20 6L9 17l-5-5" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      )}
      {copied ? "Đã copy" : label}
    </button>
  );
}

/** Bookmark (star) toggle. */
export function BookmarkButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? "Bỏ đánh dấu" : "Đánh dấu lỗi hay gặp"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
        active
          ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
          : "border-line-soft text-gray-400 hover:bg-ink-700 hover:text-white"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}

/** A titled section card used throughout the fault detail screen. */
export function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line-soft bg-ink-800/80 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-bamboo-green">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

/** The mandatory internal-use safety disclaimer (bilingual). */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-warn-orange/40 bg-warn-orange/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
      <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>
        <b>Internal training/reference only.</b> Always verify with approved AMM,
        MEL, TSM and company procedures before performing any aircraft
        maintenance action.
        {!compact && (
          <span className="mt-1 block text-amber-200/70">
            Chỉ dùng cho tra cứu/training nội bộ. Luôn đối chiếu AMM, MEL, TSM và
            quy trình được phê duyệt trước khi thực hiện trên tàu bay.
          </span>
        )}
      </span>
    </div>
  );
}
