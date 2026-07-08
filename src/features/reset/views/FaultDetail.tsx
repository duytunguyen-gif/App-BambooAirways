/** Fault detail — the core screen. Layout mirrors the reference screenshot:
 *  header → config → CB table → steps → duration → pass/fail → notes →
 *  sign-off/AMM → deferrals/MEL → footer actions. */
import { useState } from "react";
import type { ResetFaultItem } from "../types";
import { formatFullProcedure } from "../format";
import {
  BookmarkButton,
  CopyButton,
  Disclaimer,
  ScreenHeader,
  SectionCard,
  VerifiedBadge,
} from "../components/ui";
import CircuitBreakerTable from "../components/CircuitBreakerTable";

export default function FaultDetail({
  item,
  bookmarked,
  onToggleBookmark,
  onBack,
  onAddCorrection,
}: {
  item: ResetFaultItem;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onBack: () => void;
  onAddCorrection: (message: string) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="space-y-3 pb-4">
      <ScreenHeader
        title={item.faultTitle}
        subtitle={`ATA ${item.ataChapter} — ${item.ataTitle}`}
        onBack={onBack}
        right={<BookmarkButton active={bookmarked} onToggle={onToggleBookmark} />}
      />

      {/* A. Header meta */}
      <div className="flex flex-wrap items-center gap-2">
        <VerifiedBadge status={item.verifiedStatus} />
        <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
          {item.aircraftType}
        </span>
        {item.system && (
          <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
            {item.system}
          </span>
        )}
        {item.updatedAt && (
          <span className="text-[10px] text-gray-500">Cập nhật: {item.updatedAt}</span>
        )}
        <CopyButton text={formatFullProcedure(item)} label="Copy" className="ml-auto" />
      </div>

      {item.verifiedStatus !== "verified" && (
        <div className="rounded-xl border border-warn-orange/40 bg-warn-orange/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
          ⚠️ Dữ liệu <b>chưa được kiểm chứng</b> với AMM/MEL chính thức. Chỉ tham
          khảo — không dùng như tài liệu chính thức.
        </div>
      )}

      {/* Warnings (if any important callouts) */}
      {item.warnings?.length ? (
        <SectionCard title="⚠ Warnings">
          <ul className="space-y-1.5 text-sm text-amber-200">
            {item.warnings.map((w, i) => (
              <li key={i} className="flex gap-2"><span>⚠</span><span>{w}</span></li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {/* B. Aircraft configuration prior to reset */}
      {item.aircraftConfigurationPriorToReset.length > 0 && (
        <SectionCard title="Aircraft configuration prior to reset">
          <Checklist items={item.aircraftConfigurationPriorToReset} />
        </SectionCard>
      )}

      {/* C. Circuit breakers to reset */}
      <SectionCard title="Circuit breakers to reset">
        <CircuitBreakerTable cbs={item.circuitBreakersToReset} />
      </SectionCard>

      {/* D. Steps to clear warning */}
      {item.stepsToClearWarning.length > 0 && (
        <SectionCard title="Steps to clear warning">
          <ol className="space-y-2">
            {item.stepsToClearWarning.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-gray-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bamboo-green/20 text-[11px] font-bold text-bamboo-green">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {/* E. Reset duration */}
      {item.resetDuration && (
        <SectionCard title="Reset duration">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-accent"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {item.resetDuration}
          </div>
        </SectionCard>
      )}

      {/* F. Results of power up test or reset */}
      {(item.results.pass || item.results.fail) && (
        <SectionCard title="Results of power up test or reset">
          <div className="space-y-2">
            {item.results.pass && (
              <div className="rounded-lg border border-bamboo-green/40 bg-bamboo-green/10 px-3 py-2 text-sm">
                <span className="font-bold text-bamboo-green">Pass: </span>
                <span className="text-gray-200">{item.results.pass}</span>
              </div>
            )}
            {item.results.fail && (
              <div className="rounded-lg border border-warn-red/40 bg-warn-red/10 px-3 py-2 text-sm">
                <span className="font-bold text-red-300">Fail: </span>
                <span className="text-gray-200">{item.results.fail}</span>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* G. Notes */}
      {item.notes?.length ? (
        <SectionCard title="Notes">
          <Checklist items={item.notes} />
        </SectionCard>
      ) : null}

      {/* H. Sign off / Reference */}
      {item.signOffRefs?.length ? (
        <SectionCard title="Sign off / Reference">
          <ul className="space-y-1.5">
            {item.signOffRefs.map((r, i) => (
              <li key={i} className="font-mono text-xs leading-relaxed text-gray-200">{r}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {/* I. Applicable deferrals */}
      {item.applicableDeferrals?.length ? (
        <SectionCard title="Applicable deferrals">
          <ul className="space-y-1.5">
            {item.applicableDeferrals.map((r, i) => (
              <li key={i} className="font-mono text-xs font-semibold leading-relaxed text-amber-200">{r}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {item.sourceRef && (
        <p className="px-1 text-[11px] italic text-gray-500">Nguồn: {item.sourceRef}</p>
      )}

      <Disclaimer compact />

      {/* J. Footer actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <CopyButton
          text={formatFullProcedure(item)}
          label="Copy full procedure"
          className="w-full justify-center py-2.5"
        />
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-soft bg-ink-700 px-2.5 py-2.5 text-xs font-semibold text-gray-200 hover:bg-ink-600"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
          Báo lỗi / Góp ý
        </button>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-lg border border-line-soft py-2.5 text-xs font-semibold text-gray-400 hover:text-white"
      >
        ← Quay lại danh sách ATA {item.ataChapter}
      </button>

      {reportOpen && (
        <ReportModal
          item={item}
          onClose={() => setReportOpen(false)}
          onSubmit={(msg) => {
            onAddCorrection(msg);
            setReportOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-200">
          <svg className="mt-1 shrink-0 text-bamboo-green" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

function ReportModal({
  item,
  onClose,
  onSubmit,
}: {
  item: ResetFaultItem;
  onClose: () => void;
  onSubmit: (message: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const mailto = `mailto:?subject=${encodeURIComponent(
    `[ECAM Reset+] Góp ý: ${item.faultTitle}`
  )}&body=${encodeURIComponent(`Fault: ${item.faultTitle} (ATA ${item.ataChapter})\nID: ${item.id}\n\nNội dung góp ý:\n${msg}`)}`;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-line-soft bg-ink-800 p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white">Báo lỗi / Góp ý dữ liệu</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Ghi chú lưu trên máy này. Không có máy chủ — hãy dùng nút gửi email để
          chuyển cho người quản lý dữ liệu.
        </p>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={4}
          placeholder="Mô tả chỗ sai / cần sửa (vd: panel CB sai, thiếu bước…)"
          className="min16 mt-3 w-full rounded-xl border border-line bg-ink-700 p-3 text-base text-white placeholder:text-gray-500 focus:border-bamboo-green focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!msg.trim()}
            onClick={() => onSubmit(msg.trim())}
            className="flex-1 rounded-lg bg-bamboo-green py-2.5 text-sm font-bold text-ink-900 disabled:opacity-40"
          >
            Lưu ghi chú
          </button>
          <a
            href={mailto}
            className={`flex-1 rounded-lg border border-line-soft py-2.5 text-center text-sm font-semibold text-gray-200 hover:bg-ink-700 ${
              msg.trim() ? "" : "pointer-events-none opacity-40"
            }`}
          >
            Gửi email
          </a>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:text-white">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
