/** Fault detail — the core screen. Layout: header → config → CB table/image →
 *  steps → duration → pass/fail → notes → sign-off/AMM → deferrals/MEL. */
import type { ResetFaultItem } from "../types";
import { ScreenHeader, SectionCard } from "../components/ui";
import CircuitBreakerTable from "../components/CircuitBreakerTable";

export default function FaultDetail({
  item,
  onBack,
}: {
  item: ResetFaultItem;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3 pb-4">
      <ScreenHeader
        title={item.faultTitle}
        subtitle={`ATA ${item.ataChapter} — ${item.ataTitle}`}
        onBack={onBack}
      />

      {/* A. Header meta */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
          {item.aircraftType}
        </span>
        {item.system && (
          <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
            {item.system}
          </span>
        )}
      </div>

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
        <CircuitBreakerTable
          cbs={item.circuitBreakersToReset}
          cbImage={item.cbImage}
          cbImages={item.cbImages}
          cbText={item.cbText}
        />
      </SectionCard>

      {/* D. Steps to clear warning */}
      {item.stepsToClearWarning.length > 0 && (
        <SectionCard title="Steps to clear warning">
          <ol className="space-y-2">
            {item.stepsToClearWarning.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-gray-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bamboo-green/20 text-[11px] font-bold text-accent-green">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-teal"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
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
                <span className="font-bold text-accent-green">Pass: </span>
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

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-lg border border-line-soft py-2.5 text-xs font-semibold text-gray-400 hover:text-white"
      >
        ← Quay lại danh sách ATA {item.ataChapter}
      </button>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-200">
          <svg className="mt-1 shrink-0 text-accent-green" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}
