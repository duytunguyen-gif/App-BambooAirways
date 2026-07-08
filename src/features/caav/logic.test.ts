import { describe, expect, it } from "vitest";
import {
  generateMockExam,
  gradeExam,
  pickLeastSeen,
  shuffle,
  validOnly,
} from "./logic";
import type { ExamConfig, Question, SectionType } from "./types";

/** Deterministic RNG (mulberry32) so shuffle/exam tests are reproducible. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function q(
  id: string,
  section: SectionType,
  opts: { correct?: string | null; status?: Question["parseStatus"] } = {}
): Question {
  const correct = opts.correct === undefined ? "A" : opts.correct;
  return {
    id,
    crs: "A",
    cat: "CAT A",
    aircraftType: "A320",
    engineType: null,
    sourceFile: "test",
    sectionType: section,
    ataCode: null,
    ataTitle: null,
    questionNumberOriginal: 1,
    question: `Q ${id}`,
    options: [
      { key: "A", text: "a" },
      { key: "B", text: "b" },
      { key: "C", text: "c" },
    ],
    correctAnswer: correct,
    ref: null,
    answerSource: correct ? "yellow_highlight" : "unknown",
    parseStatus: opts.status ?? (correct ? "ok" : "missing_answer"),
  };
}

const CONFIG: ExamConfig = {
  lawQuestions: 15,
  typeEngineQuestions: 55,
  totalQuestions: 70,
  passPercent: 75,
};

describe("shuffle", () => {
  it("keeps exactly the same elements", () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(input, seeded(1));
    expect(out).toHaveLength(50);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    shuffle(input, seeded(2));
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("validOnly", () => {
  it("drops questions without a clear highlighted answer", () => {
    const list = [
      q("1", "LAW"),
      q("2", "LAW", { correct: null }), // missing_answer
      q("3", "LAW", { correct: null, status: "multi_answer" }),
    ];
    const out = validOnly(list);
    expect(out.map((x) => x.id)).toEqual(["1"]);
  });
});

describe("generateMockExam", () => {
  const law = Array.from({ length: 40 }, (_, i) => q(`law-${i}`, "LAW"));
  const type = Array.from({ length: 200 }, (_, i) => q(`te-${i}`, "TypeEngine"));

  it("produces exactly the configured number of LAW and Type/Engine questions", () => {
    const exam = generateMockExam({ law, typeEngine: type }, CONFIG, {
      rng: seeded(7),
    });
    expect(exam).toHaveLength(70);
    expect(exam.filter((x) => x.sectionType === "LAW")).toHaveLength(15);
    expect(exam.filter((x) => x.sectionType === "TypeEngine")).toHaveLength(55);
  });

  it("never repeats a question in the same exam", () => {
    const exam = generateMockExam({ law, typeEngine: type }, CONFIG, {
      rng: seeded(9),
    });
    const ids = new Set(exam.map((x) => x.id));
    expect(ids.size).toBe(exam.length);
  });

  it("only includes valid (highlight-answered) questions", () => {
    const dirtyLaw = [
      ...Array.from({ length: 15 }, (_, i) => q(`law-${i}`, "LAW")),
      ...Array.from({ length: 10 }, (_, i) =>
        q(`bad-${i}`, "LAW", { correct: null })
      ),
    ];
    const exam = generateMockExam({ law: dirtyLaw, typeEngine: type }, CONFIG, {
      rng: seeded(3),
    });
    expect(exam.every((x) => x.correctAnswer != null)).toBe(true);
    expect(exam.some((x) => x.id.startsWith("bad-"))).toBe(false);
  });

  it("throws with a clear message when a pool is too small", () => {
    const tinyLaw = Array.from({ length: 5 }, (_, i) => q(`law-${i}`, "LAW"));
    expect(() =>
      generateMockExam({ law: tinyLaw, typeEngine: type }, CONFIG, {
        rng: seeded(1),
      })
    ).toThrow(/LAW/);
  });

  it("spreads coverage across the pool over many exams", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 60; s++) {
      const exam = generateMockExam({ law, typeEngine: type }, CONFIG, {
        rng: seeded(s),
      });
      exam.forEach((x) => seen.add(x.id));
    }
    // every LAW question (small pool) should appear at least once
    expect(seen.size).toBeGreaterThan(150);
  });
});

describe("pickLeastSeen", () => {
  const pool = Array.from({ length: 10 }, (_, i) => q(`p-${i}`, "LAW"));

  it("prefers questions with the lowest seen-count", () => {
    // p-0..p-4 already seen once, p-5..p-9 never seen
    const seen: Record<string, number> = {};
    for (let i = 0; i < 5; i++) seen[`p-${i}`] = 1;
    const picked = pickLeastSeen(pool, 5, seen, seeded(4));
    // all 5 chosen must come from the never-seen half
    expect(picked.every((x) => Number(x.id.split("-")[1]) >= 5)).toBe(true);
  });

  it("covers the whole bank before repeating (seen-driven rotation)", () => {
    // Simulate drawing 4 questions per exam from a pool of 12, updating counts.
    const p = Array.from({ length: 12 }, (_, i) => q(`p-${i}`, "LAW"));
    const seen: Record<string, number> = {};
    const firstCycle = new Set<string>();
    for (let e = 0; e < 3; e++) {
      // 3 exams * 4 = 12 = whole pool exactly once
      const picked = pickLeastSeen(p, 4, seen, seeded(e + 1));
      picked.forEach((x) => {
        firstCycle.add(x.id);
        seen[x.id] = (seen[x.id] ?? 0) + 1;
      });
    }
    // every question appeared exactly once before any repeat
    expect(firstCycle.size).toBe(12);
    expect(Object.values(seen).every((c) => c === 1)).toBe(true);
  });
});

describe("gradeExam", () => {
  const exam = [
    q("1", "LAW", { correct: "A" }),
    q("2", "LAW", { correct: "B" }),
    q("3", "TypeEngine", { correct: "C" }),
    q("4", "TypeEngine", { correct: "A" }),
  ];

  it("scores correct answers and counts unanswered as wrong", () => {
    const res = gradeExam(exam, { "1": "A", "2": "B", "3": "A" }, 75);
    expect(res.correct).toBe(2);
    expect(res.wrong).toBe(2); // one wrong (3) + one unanswered (4)
    expect(res.unanswered).toBe(1);
    expect(res.scorePercent).toBe(50);
    expect(res.passed).toBe(false);
  });

  it("passes at exactly 75%", () => {
    const big = Array.from({ length: 100 }, (_, i) =>
      q(`${i}`, "LAW", { correct: "A" })
    );
    const answers: Record<string, string> = {};
    for (let i = 0; i < 75; i++) answers[`${i}`] = "A"; // 75 right
    for (let i = 75; i < 100; i++) answers[`${i}`] = "B"; // 25 wrong
    const res = gradeExam(big, answers, 75);
    expect(res.scorePercent).toBe(75);
    expect(res.passed).toBe(true);
  });

  it("fails just below the threshold (74%)", () => {
    const big = Array.from({ length: 100 }, (_, i) =>
      q(`${i}`, "LAW", { correct: "A" })
    );
    const answers: Record<string, string> = {};
    for (let i = 0; i < 74; i++) answers[`${i}`] = "A";
    const res = gradeExam(big, answers, 75);
    expect(res.scorePercent).toBe(74);
    expect(res.passed).toBe(false);
  });
});
