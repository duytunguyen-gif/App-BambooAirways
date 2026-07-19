/** Always-visible reference-only warning at the top of the Defects tab.
 *  Per spec this notice must never be hidden. */
export default function ReferenceWarning() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-xl border-l-4 border-warn-orange bg-ink-800/80 px-3 py-2.5 text-[13px] leading-relaxed text-gray-200"
    >
      <svg
        className="mt-0.5 shrink-0 text-warn-orange"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>Dữ liệu chỉ để tham khảo vì có thể chưa được upload kịp thời.</span>
    </div>
  );
}
