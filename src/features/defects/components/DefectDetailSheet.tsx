/** Full-detail bottom sheet for a single defect: complete description, every
 *  limit, all relevant dates and references. Read-only (viewer side). Follows
 *  the app's existing bottom-sheet pattern (scrim + rounded-top panel). */
import { useEffect } from "react";
import type { Defect, DefectLimit } from "../model";
import { defectDueInfo } from "../logic/severity";
import { formatDueDate } from "../utils/dates";
import { CONCESSION_BADGE, SEVERITY_STYLE } from "./severityStyle";
import { dueBadgeText } from "./DueBadge";

const LIMIT_LABEL: Record<DefectLimit["limitType"], string> = {
  calendar: "Lịch",
  day: "Ngày",
  fh: "Giờ bay (FH)",
  fc: "Chu kỳ (FC)",
  asap: "ASAP",
  next_shop_visit: "Next Shop Visit",
  condition: "Theo điều kiện",
  na: "N/A",
  unknown: "Không xác định",
};

interface Props {
  defect: Defect | null;
  onClose: () => void;
}

export default function DefectDetailSheet({ defect, onClose }: Props) {
  // Lock the page body while the sheet is open so the wheel/touch scroll goes to
  // the sheet's own content instead of the page behind it, and close on Escape.
  useEffect(() => {
    if (!defect) return;
    // The scroll container is <html> (document.scrollingElement) in this app, so
    // lock both <html> and <body> to be safe across browsers.
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      window.removeEventListener("keydown", onKey);
    };
  }, [defect, onClose]);

  if (!defect) return null;
  const info = defectDueInfo(defect);
  const style = SEVERITY_STYLE[info.severity];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết defect"
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border-t border-line bg-ink-800 p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-wide text-white">
                {defect.registration}
              </span>
              <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[11px] font-semibold text-gray-300 ring-1 ring-inset ring-line">
                ADD {defect.category}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {[defect.woNumber && `WO ${defect.woNumber}`, defect.defectIdRaw]
                .filter(Boolean)
                .join("  ·  ") || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] shrink-0 rounded-lg px-3 text-sm font-semibold text-gray-400 hover:text-white"
          >
            Đóng
          </button>
        </div>

        {/* Due status */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-[12px] font-semibold ${style.badge}`}
          >
            {dueBadgeText(defect)}
          </span>
          {defect.isConcession && (
            <span
              className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${CONCESSION_BADGE}`}
            >
              Concession
            </span>
          )}
          {defect.melCategory && (
            <span className="rounded-md bg-ink-700 px-2 py-1 text-[11px] font-medium text-gray-300">
              CAT {defect.melCategory}
            </span>
          )}
        </div>

        {/* Description */}
        <section className="mt-4">
          <SectionLabel>Mô tả</SectionLabel>
          {defect.shortTitle && (
            <p className="text-sm font-semibold text-white">{defect.shortTitle}</p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-300">
            {defect.fullDescription || "—"}
          </p>
        </section>

        {/* Limits */}
        <section className="mt-4">
          <SectionLabel>Giới hạn</SectionLabel>
          {defect.limits.length === 0 ? (
            <p className="text-[13px] text-gray-500">Không có giới hạn được ghi nhận.</p>
          ) : (
            <ul className="space-y-1.5">
              {defect.limits.map((l, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-ink-700 px-3 py-2"
                >
                  <span className="text-[12px] font-medium text-gray-400">
                    {LIMIT_LABEL[l.limitType] ?? l.limitType}
                  </span>
                  <span className="text-[13px] font-semibold text-gray-100">
                    {l.remainingText ?? (l.dueDate ? formatDueDate(l.dueDate) : "—")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Dates + references */}
        <section className="mt-4">
          <SectionLabel>Thông tin</SectionLabel>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
            <Field label="Due date" value={formatDueDate(defect.currentDueDate)} />
            {defect.originalDueDate && defect.isConcession && (
              <Field label="Due gốc" value={formatDueDate(defect.originalDueDate)} />
            )}
            <Field label="Ngày phát hiện" value={formatDueDate(defect.issuedDate)} />
            <Field label="Trạm" value={defect.issueStation ?? "—"} />
            <Field label="MEL" value={defect.melReference ?? "—"} />
            <Field label="Tài liệu" value={defect.docReference ?? "—"} />
          </dl>
        </section>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-gray-500">
          Dữ liệu chỉ để tham khảo. Luôn kiểm tra với tài liệu và AMOS chính thức.
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </h3>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-200">{value}</dd>
    </div>
  );
}
