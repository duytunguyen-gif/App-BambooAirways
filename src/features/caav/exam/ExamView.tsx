/** NHÁNH 3 — THI THỬ NHƯ THẬT. Sinh đề đúng cấu trúc CAAV gia hạn, chỉ chấm
 *  sau khi nộp, PASS ≥ 75%. */
import { useMemo, useState } from "react";
import { bankTitle, loadBank, loadBanks } from "../data";
import { generateMockExam, gradeExam, type ExamResult } from "../logic";
import { addExamHistory, bumpExamSeen, loadExamSeen } from "../storage";
import type { BankMeta, CaavIndex, Crs, Question } from "../types";
import ExamQuestionCard from "../components/ExamQuestionCard";
import { CrsPills, ErrorBox, ScreenHeader, Spinner } from "../components/ui";

type Stage =
  | { name: "select" }
  | { name: "loading" }
  | { name: "taking"; exam: Question[]; answers: Record<string, string> }
  | { name: "result"; exam: Question[]; answers: Record<string, string>; result: ExamResult };

export default function ExamView({
  index,
  onBack,
}: {
  index: CaavIndex;
  onBack: () => void;
}) {
  const [stage, setStage] = useState<Stage>({ name: "select" });
  const [cat, setCat] = useState<Crs | null>(null);
  const [error, setError] = useState<string | null>(null);

  const metaByFile = useMemo(() => {
    const m = new Map<string, BankMeta>();
    for (const b of index.banks) m.set(b.sourceFile, b);
    return m;
  }, [index]);

  async function startExam(c: Crs) {
    setError(null);
    setStage({ name: "loading" });
    try {
      const lawSlug = index.banks.find((b) => b.sectionType === "LAW")?.slug;
      const typeSlugs = index.crsGroups[c].banks.filter((slug) => {
        const b = index.banks.find((x) => x.slug === slug);
        return b?.sectionType === "TypeEngine";
      });
      if (!lawSlug) throw new Error("Thiếu ngân hàng LAW (Aviation Legislation).");

      const [law, typeEngine] = await Promise.all([
        loadBank(lawSlug),
        loadBanks(typeSlugs),
      ]);
      const exam = generateMockExam({ law, typeEngine }, index.examConfig[c], {
        seen: loadExamSeen(),
      });
      // remember which questions came out so next exams prefer unseen ones
      bumpExamSeen(exam.map((q) => q.id));
      setStage({ name: "taking", exam, answers: {} });
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setStage({ name: "select" });
    }
  }

  if (stage.name === "loading") {
    return (
      <div>
        <ScreenHeader title="Thi Thử Như Thật" onBack={onBack} />
        <Spinner label="Đang tạo đề thi…" />
      </div>
    );
  }

  if (stage.name === "select") {
    return (
      <div>
        <ScreenHeader
          title="Thi Thử Như Thật"
          subtitle="Đề mô phỏng kỳ thi gia hạn CAAV · PASS ≥ 75%"
          onBack={onBack}
        />
        {error && <ErrorBox message={error} />}
        <p className="mb-2 text-sm font-semibold text-gray-300">Chọn hạng thi</p>
        <CrsPills value={cat} onChange={setCat} />
        {cat && (
          <div className="mt-4 rounded-2xl border border-line-soft bg-ink-800 p-4">
            <ExamStructure cat={cat} cfg={index.examConfig[cat]} />
            <button
              type="button"
              onClick={() => startExam(cat)}
              className="mt-4 w-full rounded-xl bg-bamboo-green py-3 font-bold text-black"
            >
              Bắt đầu thi ({index.examConfig[cat].totalQuestions} câu)
            </button>
          </div>
        )}
      </div>
    );
  }

  if (stage.name === "taking") {
    return (
      <TakingView
        cat={cat!}
        exam={stage.exam}
        answers={stage.answers}
        onBack={onBack}
        onChange={(answers) => setStage({ ...stage, answers })}
        onSubmit={(answers) => {
          const result = gradeExam(stage.exam, answers, index.examConfig[cat!].passPercent);
          addExamHistory({
            examId: `${cat}-${Date.now()}`,
            date: Date.now(),
            cat: cat!,
            total: result.total,
            correct: result.correct,
            scorePercent: result.scorePercent,
            passed: result.passed,
          });
          setStage({ name: "result", exam: stage.exam, answers, result });
        }}
      />
    );
  }

  // result
  return (
    <ResultView
      result={stage.result}
      exam={stage.exam}
      metaByFile={metaByFile}
      onBack={onBack}
      onRetakeSame={() =>
        setStage({ name: "taking", exam: stage.exam, answers: {} })
      }
      onNewExam={() => startExam(cat!)}
      onToSelect={() => setStage({ name: "select" })}
    />
  );
}

function ExamStructure({ cat, cfg }: { cat: Crs; cfg: CaavIndex["examConfig"][Crs] }) {
  return (
    <div className="text-sm text-gray-300">
      <div className="font-bold text-white">Cấu trúc đề CAT {cat}</div>
      <ul className="mt-2 space-y-1">
        <li className="flex justify-between">
          <span>LAW (Luật hàng không)</span>
          <span className="font-semibold text-white">{cfg.lawQuestions} câu</span>
        </li>
        <li className="flex justify-between">
          <span>Type + Engine (chuyên môn)</span>
          <span className="font-semibold text-white">{cfg.typeEngineQuestions} câu</span>
        </li>
        <li className="flex justify-between border-t border-line-soft pt-1">
          <span>Tổng</span>
          <span className="font-bold text-accent-green">{cfg.totalQuestions} câu</span>
        </li>
        <li className="flex justify-between">
          <span>Điểm đạt</span>
          <span className="font-semibold text-white">≥ {cfg.passPercent}%</span>
        </li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
function TakingView({
  cat,
  exam,
  answers,
  onBack,
  onChange,
  onSubmit,
}: {
  cat: Crs;
  exam: Question[];
  answers: Record<string, string>;
  onBack: () => void;
  onChange: (a: Record<string, string>) => void;
  onSubmit: (a: Record<string, string>) => void;
}) {
  const [cur, setCur] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const total = exam.length;
  const answered = Object.keys(answers).length;
  const curQ = exam[cur];

  // 1-based numbers of every question the user hasn't answered yet
  const unanswered = exam
    .map((q, i) => (answers[q.id] == null ? i + 1 : 0))
    .filter((n) => n > 0);

  function choose(id: string, key: string) {
    onChange({ ...answers, [id]: key });
  }

  function submit() {
    // Must answer every question before submitting.
    if (unanswered.length > 0) {
      setWarnOpen(true);
      setNavOpen(false);
      setCur(unanswered[0] - 1); // jump to the first unanswered question
      return;
    }
    if (!confirm("Nộp bài và xem kết quả?")) return;
    onSubmit(answers);
  }

  return (
    <div>
      <ScreenHeader
        title={`Thi CAT ${cat}`}
        subtitle={`Đã làm ${answered}/${total}`}
        onBack={onBack}
      />

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full bg-bamboo-green transition-all"
          style={{ width: `${(answered / total) * 100}%` }}
        />
      </div>

      <ExamQuestionCard
        q={curQ}
        positionLabel={`Câu ${cur + 1}/${total}`}
        chosen={answers[curQ.id]}
        onChoose={(key) => choose(curQ.id, key)}
      />

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

      <button
        type="button"
        onClick={() => setNavOpen((v) => !v)}
        className="mt-3 w-full rounded-xl border border-line-soft bg-ink-800 py-2 text-sm font-semibold text-gray-300"
      >
        {navOpen ? "Ẩn danh sách câu" : "Danh sách câu"}
      </button>
      {navOpen && (
        <div className="mt-2 grid grid-cols-8 gap-1.5 rounded-xl border border-line-soft bg-ink-900/40 p-3">
          {exam.map((q, i) => {
            const done = answers[q.id] != null;
            const ring = i === cur ? "ring-2 ring-white" : "";
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setCur(i);
                  setNavOpen(false);
                }}
                className={`h-8 rounded-md text-xs font-semibold ${
                  done ? "bg-bamboo-blue/25 text-accent-blue" : "bg-ink-700 text-gray-400"
                } ${ring}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}

      {warnOpen && unanswered.length > 0 && (
        <div className="mt-4 rounded-xl border border-warn-orange/60 bg-warn-orange/10 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-accent-orange">
              Bạn phải trả lời hết mới được nộp bài. Còn {unanswered.length} câu
              chưa trả lời:
            </p>
            <button
              type="button"
              onClick={() => setWarnOpen(false)}
              aria-label="Đóng"
              className="shrink-0 text-accent-orange hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {unanswered.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setCur(n - 1);
                  setWarnOpen(false);
                }}
                className="h-8 min-w-8 rounded-md bg-warn-orange/20 px-2 text-xs font-bold text-accent-orange hover:bg-warn-orange/30"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        className="mt-4 w-full rounded-xl bg-bamboo-green py-3 font-bold text-black"
      >
        Nộp bài
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ResultView({
  result,
  exam,
  metaByFile,
  onBack,
  onRetakeSame,
  onNewExam,
  onToSelect,
}: {
  result: ExamResult;
  exam: Question[];
  metaByFile: Map<string, BankMeta>;
  onBack: () => void;
  onRetakeSame: () => void;
  onNewExam: () => void;
  onToSelect: () => void;
}) {
  const [onlyWrong, setOnlyWrong] = useState(true);
  const byId = useMemo(() => {
    const m = new Map<string, Question>();
    for (const q of exam) m.set(q.id, q);
    return m;
  }, [exam]);

  const shown = result.details.filter((d) => (onlyWrong ? !d.isRight : true));

  return (
    <div>
      <ScreenHeader title="Kết quả thi" onBack={onBack} />

      {/* score card */}
      <div
        className={`rounded-2xl border p-5 text-center ${
          result.passed
            ? "border-bamboo-green/60 bg-bamboo-green/10"
            : "border-warn-red/60 bg-warn-red/10"
        }`}
      >
        <div
          className={`text-3xl font-extrabold ${
            result.passed ? "text-accent-green" : "text-accent-red"
          }`}
        >
          {result.passed ? "PASS" : "TRƯỢT"}
        </div>
        <div className="mt-1 text-4xl font-bold text-white">
          {result.scorePercent}%
        </div>
        <div className="mt-2 text-sm text-gray-300">
          Đúng {result.correct}/{result.total} câu · Sai {result.wrong}
          {result.unanswered > 0 && ` · Bỏ trống ${result.unanswered}`}
        </div>
      </div>

      {/* actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onNewExam}
          className="rounded-xl bg-bamboo-green py-2.5 text-sm font-bold text-black"
        >
          Tạo đề mới
        </button>
        <button
          type="button"
          onClick={onRetakeSame}
          className="rounded-xl border border-line py-2.5 text-sm font-semibold text-gray-200"
        >
          Làm lại đề này
        </button>
      </div>
      <button
        type="button"
        onClick={onToSelect}
        className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-gray-500 hover:text-gray-300"
      >
        Về chọn hạng thi
      </button>

      {/* review */}
      <div className="mb-2 mt-5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Xem lại</h3>
        <button
          type="button"
          onClick={() => setOnlyWrong((v) => !v)}
          className="rounded-full border border-line-soft px-3 py-1 text-xs font-semibold text-gray-300"
        >
          {onlyWrong ? "Xem tất cả" : "Chỉ câu sai"}
        </button>
      </div>

      <div className="space-y-2.5">
        {shown.map((d, i) => {
          const q = byId.get(d.id)!;
          const meta = metaByFile.get(q.sourceFile);
          return (
            <div
              key={d.id}
              className={`rounded-xl border p-3.5 ${
                d.isRight
                  ? "border-line-soft bg-ink-800"
                  : "border-warn-red/40 bg-warn-red/5"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Câu {i + 1}</span>
                <span className="truncate">
                  {(meta ? bankTitle(meta) : "")}
                  {q.ataCode ? ` · ${q.ataCode}` : ""}
                </span>
              </div>
              <p className="text-sm font-medium leading-snug text-white">
                {q.question}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <div>
                  <span className="text-gray-400">Bạn chọn: </span>
                  <span className={d.isRight ? "text-accent-green" : "text-accent-red"}>
                    {d.chosen ?? "— (bỏ trống)"}
                  </span>
                </div>
                {!d.isRight && (
                  <div>
                    <span className="text-gray-400">Đáp án đúng: </span>
                    <span className="font-semibold text-accent-green">
                      {d.correct}
                    </span>
                  </div>
                )}
              </div>
              {q.ref && <div className="mt-1 text-xs text-gray-500">{q.ref}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
