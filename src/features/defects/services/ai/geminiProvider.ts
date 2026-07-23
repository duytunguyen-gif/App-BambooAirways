/** Gemini provider for the AI cleanup pass.
 *
 *  Uses the Google Generative Language REST API (an `AIza…` API key). Per the
 *  privacy contract this MUST point at a PAID / no-train project — that is a
 *  property of the Google Cloud project/billing, not a request parameter, so it
 *  cannot be enforced in code; it is the operator's responsibility. The key is
 *  read from server-side env only (never a VITE_ var) and never logged.
 *
 *  Default model: gemini-2.5-flash (fast + cheap; Pro is unnecessary here). */
import { buildUserPrompt, parseAiResponse, RESPONSE_SCHEMA, SYSTEM_INSTRUCTION } from "./prompt.js";
import type { AiExtractInput, AiExtractResult, AiProvider, FetchLike } from "./types.js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: FetchLike;
}

export function createGeminiProvider(opts: GeminiOptions): AiProvider {
  const model = opts.model || DEFAULT_MODEL;
  const doFetch = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const available = Boolean(opts.apiKey);

  return {
    name: "gemini",
    available,
    async extract(input: AiExtractInput): Promise<AiExtractResult> {
      if (!available) {
        return {
          provider: "gemini",
          model,
          ok: false,
          message: "Thiếu GEMINI_API_KEY — không thể gọi AI.",
          defects: [],
        };
      }
      const url = `${ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
      const body = {
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      };

      let res;
      try {
        res = await doFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (e) {
        return {
          provider: "gemini",
          model,
          ok: false,
          message: `Lỗi mạng khi gọi Gemini: ${(e as Error).message}`,
          defects: [],
        };
      }

      const rawText = await res.text();
      if (!res.ok) {
        // Surface a short, safe error (never echo the key or full body).
        return {
          provider: "gemini",
          model,
          ok: false,
          message: `Gemini trả lỗi HTTP ${res.status}. Kiểm tra API key/quota/model.`,
          defects: [],
        };
      }

      let payload: any;
      try {
        payload = JSON.parse(rawText);
      } catch {
        return {
          provider: "gemini",
          model,
          ok: false,
          message: "Không đọc được phản hồi Gemini (không phải JSON).",
          defects: [],
        };
      }

      const partText: string | undefined =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!partText) {
        const blockReason = payload?.promptFeedback?.blockReason;
        return {
          provider: "gemini",
          model,
          ok: false,
          message: blockReason
            ? `Gemini chặn nội dung (${blockReason}).`
            : "Gemini không trả về nội dung.",
          defects: [],
        };
      }

      try {
        const defects = parseAiResponse(partText, input.registration, input.category);
        const usedTokens = payload?.usageMetadata?.totalTokenCount;
        return {
          provider: "gemini",
          model,
          ok: true,
          message: `AI đã trích xuất ${defects.length} defect cho ${input.registration}.`,
          defects,
          usedTokens,
        };
      } catch (e) {
        return {
          provider: "gemini",
          model,
          ok: false,
          message: `AI trả về JSON không hợp lệ: ${(e as Error).message}`,
          defects: [],
        };
      }
    },
  };
}
