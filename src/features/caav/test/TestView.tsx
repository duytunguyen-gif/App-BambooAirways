/** NHÁNH 2 — TEST BANK. Tự luyện toàn bộ câu hỏi hợp lệ: ẩn Key, chọn đáp án
 *  xong báo đúng/sai ngay, thống kê realtime, lưu tiến độ để làm tiếp. */
import { useEffect, useMemo, useState } from "react";
import { bankTitle, loadBanks } from "../data";
import { shuffle, validOnly } from "../logic";
import {
  clearTestProgress,
  loadTestProgress,
  saveTestProgress,
  type TestProgress,
} from "../storage";
import type { BankMeta, CaavIndex, Crs, Question } from "../types";
import TestQuestionCard from "../components/TestQuestionCard";
import { CrsPills, EmptyBox, ErrorBox, ScreenHeader, Spinner } from "../components/ui";

type Stage =
  | { name: "loading" }
  | { name: "resume"; saved: TestProgress }
  | { name: "select" }
  | { name: "session"; progress: TestProgress };

export default function TestView({
  index,
  onBack,
}: {
  index: CaavIndex;
  onBack: () => void;
}) {
  const [stage, setStage] = useState<Stage>({ name: "loading" });

  useEffect(() => {
    const saved = loadTestProgress();
    setStage(saved ? { name: "resume", saved } : { name: "select" });
  }, []);

  if (stage.name === "loading") return <Spinner />;

  if (stage.name === "resume") {
    const s = stage.saved;
    return (
      <div>
        <ScreenHeader title="Test Bank" onBack={onBack} />
        <div className="rounded-2xl border border-line-soft bg-ink-800 p-4">
          <p className="text-sm text-gray-300">
            Bạn có một bài test đang làm dở:
          </p>
          <p className="mt-1 font-bold text-white">{s.scopeLabel}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Đã trả lời {Object.keys(s.answers).length}/{s.order.length} câu
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStage({ name: "session", progress: s })}
              className="rounded-xl bg-bamboo-green py-2.5 text-sm font-bold text-black"
            >
              Tiếp tục
            </button>
            <button
              type="button"
              onClick={() => {
                clearTestProgress();
                setStage({ name: "select" });
              }}
              className="rounded-xl border border-line py-2.5 text-sm font-semibold text-gray-200"
            >
              Bắt đầu mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage.name === "select") {
    return (
      <ScopeSelect
        index={index}
        onBack={onBack}
        onStart={(progress) => {
          saveTestProgress(progress);
          setStage({ name: "session", progress });
        }}
      />
    );
  }

  return (
    <TestSession
      index={index}
      progress={stage.progress}
      onBack={onBack}
      onExitToSelect={() => setStage({ name: "select" })}
    />
  );
}

// ---------------------------------------------------------------------------
// Scope selection: choose CRS, then "toàn bộ CRS" or a single bank.
// ---------------------------------------------------------------------------
function ScopeSelect({
  index,
  onBack,
  onStart,
}: {
  index: CaavIndex;
  onBack: () => void;
  onStart: (p: TestProgress) => void;
}) {
  const [crs, setCrs] = useState<Crs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const banks = crs
    ? index.crsGroups[crs].banks
        .map((slug) => index.banks.find((b) => b.slug === slug))
        .filter((b): b is BankMeta => Boolean(b))
    : [];
  const totalValid = banks.reduce((n, b) => n + b.okCount, 0);

  async function start(scopeId: string, scopeLabel: string, slugs: string[]) {
    if (!crs) return;
    setBusy(true);
    setError(null);
    try {
      const qs = validOnly(await loadBanks(slugs));
      const order = shuffle(qs).map((q) => q.id);
      onStart({
        scopeId: `${crs}::${scopeId}`,
        scopeLabel,
        crs,
        slugs,
        order,
        answers: {},
        createdAt: Date.now(),
        baseOrder: order,
        baseLabel: scopeLabel,
      });
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setBusy(false);
    }
  }

  return (
    <div>
      <ScreenHeader
        title="Test Bank"
        subtitle="Luyện toàn bộ câu hỏi hợp lệ, biết đúng/sai ngay"
        onBack={onBack}
      />
      {error && <ErrorBox message={error} />}

      <p className="mb-2 text-sm font-semibold text-gray-300">1. Chọn CRS</p>
      <CrsPills value={crs} onChange={setCrs} />

      {crs && (
        <>
          <p className="mb-2 mt-5 text-sm font-semibold text-gray-300">
            2. Chọn phạm vi test
          </p>
          {busy ? (
            <Spinner label="Đang tạo bài test…" />
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  start(
                    "all",
                    `Toàn bộ CRS ${crs}`,
                    banks.map((b) => b.slug)
                  )
                }
                className="w-full rounded-xl border border-bamboo-green/60 bg-bamboo-green/10 p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Toàn bộ CRS {crs}</span>
                  <span className="text-sm font-bold text-bamboo-green">
                    {totalValid} câu
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Tất cả câu hỏi hợp lệ của {banks.length} bộ đề
                </div>
              </button>

              {banks.map((b) => (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => start(b.slug, bankTitle(b), [b.slug])}
                  className="w-full rounded-xl border border-line-soft bg-ink-800 p-4 text-left hover:border-line"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {bankTitle(b)}
                    </span>
                    <span className="text-sm font-bold text-bamboo-green">
                      {b.okCount} câu
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active test session.
// ---------------------------------------------------------------------------
type NavFilter = "all" | "wrong" | "todo";

function TestSession({
  index,
  progress,
  onBack,
  onExitToSelect,
}: {
  index: CaavIndex;
  progress: TestProgress;
  onBack: () => void;
  onExitToSelect: () => void;
}) {
  // Older saved sessions predate baseOrder/baseLabel — backfill from the
  // current set so "Làm lại từ đầu" still has something to restore to.
  const [prog, setProg] = useState<TestProgress>(() => ({
    ...progress,
    baseOrder: progress.baseOrder ?? progress.order,
    baseLabel: progress.baseLabel ?? progress.scopeLabel,
  }));
  const [qmap, setQmap] = useState<Map<string, Question> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cur, setCur] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [filter, setFilter] = useState<NavFilter>("all");

  const metaByFile = useMemo(() => {
    const m = new Map<string, BankMeta>();
    for (const b of index.banks) m.set(b.sourceFile, b);
    return m;
  }, [index]);

  useEffect(() => {
    let alive = true;
    loadBanks(progress.slugs)
      .then((all) => {
        if (!alive) return;
        const m = new Map<string, Question>();
        for (const q of all) m.set(q.id, q);
        setQmap(m);
      })
      .catch((e) => alive && setError(String((e as Error).message ?? e)));
    return () => {
      alive = false;
    };
  }, [progress.slugs]);

  function update(next: TestProgress) {
    setProg(next);
    saveTestProgress(next);
  }

  function choose(id: string, key: string) {
    if (prog.answers[id] != null) return; // locked once answered
    update({ ...prog, answers: { ...prog.answers, [id]: key } });
  }

  const stats = useMemo(() => {
    if (!qmap) return { answered: 0, correct: 0, wrong: 0 };
    let correct = 0;
    let answered = 0;
    for (const id of prog.order) {
      const a = prog.answers[id];
      if (a == null) continue;
      answered++;
      if (qmap.get(id)?.correctAnswer === a) correct++;
    }
    return { answered, correct, wrong: answered - correct };
  }, [prog, qmap]);

  if (error) {
    return (
      <div>
        <ScreenHeader title="Test Bank" onBack={onBack} />
        <ErrorBox message={error} />
      </div>
    );
  }
  if (!qmap) {
    return (
      <div>
        <ScreenHeader title="Test Bank" onBack={onBack} />
        <Spinner label="Đang tải câu hỏi…" />
      </div>
    );
  }

  const total = prog.order.length;
  const curId = prog.order[cur];
  const curQ = qmap.get(curId)!;
  const pct = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;

  function statusOf(id: string): "todo" | "correct" | "wrong" {
    const a = prog.answers[id];
    if (a == null) return "todo";
    return qmap!.get(id)?.correctAnswer === a ? "correct" : "wrong";
  }

  function restart() {
    const narrowed = prog.order.length !== (prog.baseOrder?.length ?? prog.order.length);
    const msg = narrowed
      ? "Làm lại từ đầu? Sẽ quay về toàn bộ đề gốc và xoá kết quả hiện tại."
      : "Làm lại từ đầu? Kết quả hiện tại sẽ bị xoá.";
    if (!confirm(msg)) return;
    // Restore the full original test (undoing any "Test lại câu sai" narrowing).
    const base = prog.baseOrder ?? prog.order;
    update({
      ...prog,
      scopeLabel: prog.baseLabel ?? prog.scopeLabel,
      order: shuffle(base),
      answers: {},
      createdAt: Date.now(),
    });
    setCur(0);
    setFilter("all");
  }

  function retryWrong() {
    const wrongIds = prog.order.filter((id) => statusOf(id) === "wrong");
    if (wrongIds.length === 0) return;
    update({
      ...prog,
      scopeLabel: `${prog.scopeLabel} · câu sai`,
      order: shuffle(wrongIds),
      answers: {},
      createdAt: Date.now(),
    });
    setCur(0);
    setFilter("all");
  }

  const navIds = prog.order.filter((id) => {
    if (filter === "wrong") return statusOf(id) === "wrong";
    if (filter === "todo") return statusOf(id) === "todo";
    return true;
  });

  return (
    <div>
      <ScreenHeader
        title={prog.scopeLabel}
        subtitle={`Đã làm ${stats.answered}/${total}`}
        onBack={onBack}
      />

      {/* stats bar */}
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Đúng" value={stats.correct} tone="text-bamboo-green" />
        <Stat label="Sai" value={stats.wrong} tone="text-warn-red" />
        <Stat label="% đúng" value={`${pct}%`} tone="text-white" />
      </div>

      <TestQuestionCard
        q={curQ}
        positionLabel={`Câu ${cur + 1}/${total}`}
        chosen={prog.answers[curId]}
        onChoose={(key) => choose(curId, key)}
        meta={metaByFile.get(curQ.sourceFile)}
      />

      {/* prev / next */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={cur === 0}
          onClick={() => setCur((i) => Math.max(0, i - 1))}
          className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-gray-200 disabled:opacity-40"
        >
          ← Câu trước
        </button>
        <button
          type="button"
          disabled={cur >= total - 1}
          onClick={() => setCur((i) => Math.min(total - 1, i + 1))}
          className="flex-1 rounded-xl bg-ink-700 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Câu sau →
        </button>
      </div>

      {/* navigator toggle */}
      <button
        type="button"
        onClick={() => setNavOpen((v) => !v)}
        className="mt-3 w-full rounded-xl border border-line-soft bg-ink-800 py-2 text-sm font-semibold text-gray-300"
      >
        {navOpen ? "Ẩn danh sách câu" : "Danh sách câu"}
      </button>

      {navOpen && (
        <div className="mt-2 rounded-xl border border-line-soft bg-ink-900/40 p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {(
              [
                ["all", "Tất cả"],
                ["wrong", "Chỉ câu sai"],
                ["todo", "Chưa làm"],
              ] as [NavFilter, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  filter === k
                    ? "border-teal-accent bg-teal-accent/15 text-teal-accent"
                    : "border-line-soft bg-ink-800 text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {navIds.length === 0 ? (
            <EmptyBox message="Không có câu nào." />
          ) : (
            <div className="grid grid-cols-8 gap-1.5">
              {navIds.map((id) => {
                const i = prog.order.indexOf(id);
                const st = statusOf(id);
                const bg =
                  st === "correct"
                    ? "bg-bamboo-green/25 text-bamboo-green"
                    : st === "wrong"
                      ? "bg-warn-red/25 text-red-300"
                      : "bg-ink-700 text-gray-400";
                const ring = i === cur ? "ring-2 ring-white" : "";
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setCur(i);
                      setNavOpen(false);
                    }}
                    className={`h-8 rounded-md text-xs font-semibold ${bg} ${ring}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={retryWrong}
          disabled={stats.wrong === 0}
          className="rounded-xl border border-warn-orange/60 bg-warn-orange/10 py-2.5 text-sm font-semibold text-warn-orange disabled:opacity-40"
        >
          Test lại câu sai ({stats.wrong})
        </button>
        <button
          type="button"
          onClick={restart}
          className="rounded-xl border border-line py-2.5 text-sm font-semibold text-gray-200"
        >
          Làm lại từ đầu
        </button>
      </div>
      <button
        type="button"
        onClick={onExitToSelect}
        className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-gray-500 hover:text-gray-300"
      >
        Chọn phạm vi khác
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-line-soft bg-ink-800 py-2">
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}
