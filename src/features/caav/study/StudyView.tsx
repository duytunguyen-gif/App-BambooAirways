/** NHÁNH 1 — HỌC BANK. Chọn CRS → chọn bộ đề → học theo ATA, hiện Key ngay. */
import { useEffect, useMemo, useState } from "react";
import { bankSubtitle, bankTitle, loadBank } from "../data";
import { loadMarks, saveMarks, type MarkMap } from "../storage";
import type { BankMeta, CaavIndex, Crs, Question } from "../types";
import StudyQuestionCard from "../components/StudyQuestionCard";
import { CrsPills, EmptyBox, ErrorBox, ScreenHeader, Spinner } from "../components/ui";

export default function StudyView({
  index,
  onBack,
}: {
  index: CaavIndex;
  onBack: () => void;
}) {
  const [crs, setCrs] = useState<Crs | null>(null);
  const [bank, setBank] = useState<BankMeta | null>(null);

  if (bank) {
    return <BankStudy meta={bank} onBack={() => setBank(null)} />;
  }

  return (
    <div>
      <ScreenHeader
        title="Học Bank"
        subtitle="Xem câu hỏi kèm đáp án đúng để học nhanh"
        onBack={onBack}
      />

      <p className="mb-2 text-sm font-semibold text-gray-300">1. Chọn CRS</p>
      <CrsPills value={crs} onChange={setCrs} />

      {crs && (
        <>
          <p className="mb-2 mt-5 text-sm font-semibold text-gray-300">
            2. Chọn bộ đề
          </p>
          <div className="space-y-2.5">
            {index.crsGroups[crs].banks
              .map((slug) => index.banks.find((b) => b.slug === slug))
              .filter((b): b is BankMeta => Boolean(b))
              .map((b) => (
                <BankCard key={b.slug} meta={b} onOpen={() => setBank(b)} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function BankCard({ meta, onOpen }: { meta: BankMeta; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-line-soft bg-ink-800 p-4 text-left transition-colors hover:border-line"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-white">{bankTitle(meta)}</span>
        <span className="shrink-0 text-sm font-bold text-bamboo-green">
          {meta.total} câu
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-400">{bankSubtitle(meta)}</div>
      {meta.okCount < meta.total && (
        <div className="mt-1 text-xs text-warn-orange">
          {meta.total - meta.okCount} câu chưa xác định đáp án
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------

type Filter = "all" | "answered" | "unknown" | "marked";
const PAGE = 20;

function BankStudy({ meta, onBack }: { meta: BankMeta; onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [marks, setMarks] = useState<MarkMap>(() => loadMarks());
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    loadBank(meta.slug)
      .then((qs) => alive && setQuestions(qs))
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
  }, [meta.slug]);

  const toggleMark = (id: string) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      saveMarks(next);
      return next;
    });
  };

  const searching = search.trim().length > 0;

  const filtered = useMemo(() => {
    if (!questions) return [];
    const q = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (filter === "answered" && item.parseStatus !== "ok") return false;
      if (filter === "unknown" && item.parseStatus === "ok") return false;
      if (filter === "marked" && !marks[item.id]) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        (item.ref ?? "").toLowerCase().includes(q) ||
        item.options.some((o) => o.text.toLowerCase().includes(q))
      );
    });
  }, [questions, search, filter, marks]);

  // group filtered questions by ATA (or a single "Khác" bucket)
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: Question[] }>();
    for (const item of filtered) {
      const key = item.ataCode ?? "GEN";
      const label = item.ataCode
        ? `${item.ataCode}${item.ataTitle ? ` · ${item.ataTitle}` : ""}`
        : "Danh sách câu hỏi";
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(item);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [filtered]);

  if (error) {
    return (
      <div>
        <ScreenHeader title={bankTitle(meta)} onBack={onBack} />
        <ErrorBox message={error} />
      </div>
    );
  }
  if (!questions) {
    return (
      <div>
        <ScreenHeader title={bankTitle(meta)} onBack={onBack} />
        <Spinner label="Đang tải bộ đề…" />
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader
        title={bankTitle(meta)}
        subtitle={`${filtered.length}/${questions.length} câu`}
        onBack={onBack}
      />

      {/* toolbar */}
      <div className="mb-3 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo nội dung, đáp án, ref…"
          className="min16 h-11 w-full rounded-xl border border-line bg-ink-700 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-bamboo-green focus:ring-2 focus:ring-bamboo-green/30"
        />
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "Tất cả"],
              ["answered", "Có đáp án"],
              ["unknown", "Chưa xác định"],
              ["marked", "Đã đánh dấu"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === key
                  ? "border-teal-accent bg-teal-accent/15 text-teal-accent"
                  : "border-line-soft bg-ink-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="ml-auto rounded-full border border-bamboo-green/60 bg-bamboo-green/10 px-3 py-1 text-xs font-semibold text-bamboo-green"
          >
            {showKey ? "Ẩn toàn bộ Key" : "Hiện toàn bộ Key"}
          </button>
        </div>
      </div>

      {/* groups */}
      {groups.length === 0 ? (
        <EmptyBox message="Không có câu hỏi nào khớp bộ lọc." />
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => {
            const isOpen = searching || openGroups[g.key];
            const shown = isOpen
              ? g.items.slice(0, searching ? g.items.length : visible[g.key] ?? PAGE)
              : [];
            return (
              <div key={g.key} className="rounded-xl border border-line-soft bg-ink-900/40">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((p) => ({ ...p, [g.key]: !p[g.key] }))
                  }
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
                >
                  <span className="min-w-0 truncate text-sm font-bold text-white">
                    {g.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                    {g.items.length} câu
                    <svg
                      className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-2.5 px-2.5 pb-3">
                    {shown.map((q) => (
                      <StudyQuestionCard
                        key={q.id}
                        q={q}
                        showKey={showKey}
                        marked={Boolean(marks[q.id])}
                        onToggleMark={() => toggleMark(q.id)}
                      />
                    ))}
                    {!searching && shown.length < g.items.length && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisible((p) => ({
                            ...p,
                            [g.key]: (p[g.key] ?? PAGE) + PAGE,
                          }))
                        }
                        className="w-full rounded-lg border border-line-soft bg-ink-800 py-2 text-xs font-semibold text-gray-300 hover:text-white"
                      >
                        Xem thêm {Math.min(PAGE, g.items.length - shown.length)} câu
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
