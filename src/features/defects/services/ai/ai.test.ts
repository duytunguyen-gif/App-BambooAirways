import { describe, it, expect } from "vitest";
import { buildUserPrompt, parseAiResponse } from "./prompt";
import { createGeminiProvider } from "./geminiProvider";
import { createOpenAiProvider } from "./openaiProvider";
import { createNoneProvider } from "./noneProvider";
import { getAiProvider } from "./index";
import type { AiExtractInput, FetchLike } from "./types";

const input: AiExtractInput = {
  registration: "VN-A585",
  category: "B",
  expectedOpenCount: 28,
  rawText: "A585/WO 1039526 PANEL MAT BALL 132NF AND 131LF AT FWD CARGO ARE DAMAGE",
  draft: [
    {
      registration: "VN-A585",
      category: "B",
      woNumber: "1039526",
      defectIdRaw: null,
      shortTitle: "CARGO ARE DAMAGE",
      fullDescription: "CARGO ARE DAMAGE",
      currentDueDate: null,
      isConcession: false,
      melReference: null,
      melCategory: null,
      limits: [],
    },
  ],
};

describe("prompt", () => {
  it("embeds registration, count hint and raw text", () => {
    const p = buildUserPrompt(input);
    expect(p).toContain("VN-A585");
    expect(p).toContain("28 open anchor rows");
    expect(p).toContain("PANEL MAT BALL 132NF");
    expect(p).toContain('"woNumber":"1039526"'); // draft hint present
  });

  it("parses valid JSON and stamps registration/category", () => {
    const raw = JSON.stringify({
      defects: [
        {
          woNumber: "1039526",
          shortTitle: "FWD cargo panel damage",
          fullDescription: "PANEL MAT BALL 132NF AND 131LF AT FWD CARGO ARE DAMAGE",
          isConcession: false,
          limits: [{ limitType: "day", remainingText: "-1 Day", dueDate: null }],
        },
      ],
    });
    const out = parseAiResponse(raw, "VN-A585", "B");
    expect(out).toHaveLength(1);
    expect(out[0].registration).toBe("VN-A585");
    expect(out[0].category).toBe("B");
    expect(out[0].currentDueDate).toBeNull(); // defaulted
    expect(out[0].limits[0].limitType).toBe("day");
  });

  it("recovers JSON wrapped in ``` fences", () => {
    const raw = "```json\n" + JSON.stringify({ defects: [] }) + "\n```";
    expect(parseAiResponse(raw, "VN-A585", "B")).toEqual([]);
  });

  it("throws on non-JSON garbage", () => {
    expect(() => parseAiResponse("not json at all", "VN-A585", "B")).toThrow();
  });
});

describe("geminiProvider", () => {
  const okFetch: FetchLike = async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    defects: [
                      {
                        woNumber: "1039526",
                        shortTitle: "FWD cargo panel damage",
                        fullDescription: "FWD CARGO ARE DAMAGE",
                        isConcession: false,
                        limits: [],
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
        usageMetadata: { totalTokenCount: 1234 },
      }),
  });

  it("returns cleaned defects on success", async () => {
    const p = createGeminiProvider({ apiKey: "AIzaTEST", fetchImpl: okFetch });
    expect(p.available).toBe(true);
    const r = await p.extract(input);
    expect(r.ok).toBe(true);
    expect(r.defects).toHaveLength(1);
    expect(r.defects[0].shortTitle).toBe("FWD cargo panel damage");
    expect(r.usedTokens).toBe(1234);
  });

  it("reports HTTP errors without throwing or leaking the key", async () => {
    const errFetch: FetchLike = async () => ({
      ok: false,
      status: 429,
      text: async () => "quota exceeded",
    });
    const p = createGeminiProvider({ apiKey: "AIzaSECRET", fetchImpl: errFetch });
    const r = await p.extract(input);
    expect(r.ok).toBe(false);
    expect(r.message).toContain("429");
    expect(JSON.stringify(r)).not.toContain("AIzaSECRET");
  });

  it("is unavailable without a key", async () => {
    const p = createGeminiProvider({ apiKey: "", fetchImpl: okFetch });
    expect(p.available).toBe(false);
    const r = await p.extract(input);
    expect(r.ok).toBe(false);
  });
});

describe("openaiProvider", () => {
  const okFetch: FetchLike = async (_url, init) => {
    // sanity: uses bearer auth + chat completions
    if (!init.headers.Authorization?.startsWith("Bearer ")) throw new Error("no auth header");
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  defects: [
                    {
                      woNumber: "1039527",
                      shortTitle: "AFT cargo panel damage",
                      fullDescription: "AFT CARGO ARE DAMAGE",
                      isConcession: false,
                      limits: [],
                    },
                  ],
                }),
              },
            },
          ],
          usage: { total_tokens: 555 },
        }),
    };
  };

  it("returns cleaned defects on success", async () => {
    const p = createOpenAiProvider({ apiKey: "sk-TEST", fetchImpl: okFetch });
    expect(p.available).toBe(true);
    const r = await p.extract(input);
    expect(r.ok).toBe(true);
    expect(r.defects).toHaveLength(1);
    expect(r.defects[0].shortTitle).toBe("AFT cargo panel damage");
    expect(r.defects[0].registration).toBe("VN-A585");
    expect(r.usedTokens).toBe(555);
  });

  it("reports HTTP errors without leaking the key", async () => {
    const errFetch: FetchLike = async () => ({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    });
    const p = createOpenAiProvider({ apiKey: "sk-SECRET", fetchImpl: errFetch });
    const r = await p.extract(input);
    expect(r.ok).toBe(false);
    expect(r.message).toContain("401");
    expect(JSON.stringify(r)).not.toContain("sk-SECRET");
  });

  it("surfaces a model refusal", async () => {
    const refuseFetch: FetchLike = async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ choices: [{ message: { refusal: "I can't help with that." } }] }),
    });
    const p = createOpenAiProvider({ apiKey: "sk-X", fetchImpl: refuseFetch });
    const r = await p.extract(input);
    expect(r.ok).toBe(false);
    expect(r.message).toContain("từ chối");
  });

  it("is unavailable without a key", () => {
    expect(createOpenAiProvider({ apiKey: "" }).available).toBe(false);
  });
});

describe("noneProvider + factory", () => {
  it("none passes the draft through unchanged", async () => {
    const r = await createNoneProvider().extract(input);
    expect(r.ok).toBe(false);
    expect(r.defects).toEqual(input.draft);
  });

  it("factory returns none when AI is off or key missing", () => {
    expect(getAiProvider({ AI_PROVIDER: "none" }).name).toBe("none");
    expect(getAiProvider({ AI_PROVIDER: "gemini" }).name).toBe("none"); // no key
    expect(getAiProvider({ AI_PROVIDER: "openai" }).name).toBe("none"); // no key
  });

  it("factory returns openai when configured", () => {
    const p = getAiProvider({ AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-X" });
    expect(p.name).toBe("openai");
    expect(p.available).toBe(true);
  });

  it("factory returns gemini when configured", () => {
    const p = getAiProvider({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "AIzaX" });
    expect(p.name).toBe("gemini");
    expect(p.available).toBe(true);
  });
});
