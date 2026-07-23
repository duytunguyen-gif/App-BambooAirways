/** OpenAI provider for the AI cleanup pass.
 *
 *  Uses the Chat Completions API with JSON mode. Data sent through the OpenAI
 *  API is NOT used to train models by default (paid platform account), which
 *  satisfies the "paid / no-train" privacy contract (see memory:
 *  defects-ai-decision). The key is read from server-side env only (never a
 *  VITE_ var) and never logged.
 *
 *  Default model: gpt-4o-mini (cheap + reliable JSON; the full 4o/4.1 models are
 *  unnecessary for this extraction task). */
import { buildUserPrompt, parseAiResponse, SYSTEM_INSTRUCTION } from "./prompt.js";
import type { AiExtractInput, AiExtractResult, AiProvider, FetchLike } from "./types.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface OpenAiOptions {
  apiKey: string;
  model?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: FetchLike;
}

export function createOpenAiProvider(opts: OpenAiOptions): AiProvider {
  const model = opts.model || DEFAULT_MODEL;
  const doFetch = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const available = Boolean(opts.apiKey);

  return {
    name: "openai",
    available,
    async extract(input: AiExtractInput): Promise<AiExtractResult> {
      if (!available) {
        return {
          provider: "openai",
          model,
          ok: false,
          message: "Thiếu OPENAI_API_KEY — không thể gọi AI.",
          defects: [],
        };
      }
      const body = {
        model,
        temperature: 0,
        // JSON mode: the model must return a single JSON object. Our prompt +
        // zod validation (parseAiResponse) enforce the shape.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: buildUserPrompt(input) },
        ],
      };

      let res;
      try {
        res = await doFetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${opts.apiKey}`,
          },
          body: JSON.stringify(body),
        });
      } catch (e) {
        return {
          provider: "openai",
          model,
          ok: false,
          message: `Lỗi mạng khi gọi OpenAI: ${(e as Error).message}`,
          defects: [],
        };
      }

      const rawText = await res.text();
      if (!res.ok) {
        return {
          provider: "openai",
          model,
          ok: false,
          message: `OpenAI trả lỗi HTTP ${res.status}. Kiểm tra API key/credit/model.`,
          defects: [],
        };
      }

      let payload: any;
      try {
        payload = JSON.parse(rawText);
      } catch {
        return {
          provider: "openai",
          model,
          ok: false,
          message: "Không đọc được phản hồi OpenAI (không phải JSON).",
          defects: [],
        };
      }

      const content: string | undefined = payload?.choices?.[0]?.message?.content;
      const refusal: string | undefined = payload?.choices?.[0]?.message?.refusal;
      if (refusal) {
        return {
          provider: "openai",
          model,
          ok: false,
          message: `OpenAI từ chối xử lý: ${refusal}`,
          defects: [],
        };
      }
      if (!content) {
        return {
          provider: "openai",
          model,
          ok: false,
          message: "OpenAI không trả về nội dung.",
          defects: [],
        };
      }

      try {
        const defects = parseAiResponse(content, input.registration, input.category);
        const usedTokens = payload?.usage?.total_tokens;
        return {
          provider: "openai",
          model,
          ok: true,
          message: `AI đã trích xuất ${defects.length} defect cho ${input.registration}.`,
          defects,
          usedTokens,
        };
      } catch (e) {
        return {
          provider: "openai",
          model,
          ok: false,
          message: `AI trả về JSON không hợp lệ: ${(e as Error).message}`,
          defects: [],
        };
      }
    },
  };
}
