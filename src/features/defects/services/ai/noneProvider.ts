/** The default no-op provider: keeps the pipeline parser-only. Returns a clear
 *  "not configured" result so the uploader edits the deterministic draft by
 *  hand. Selected whenever AI_PROVIDER is unset/"none" or no key is present. */
import type { AiExtractInput, AiExtractResult, AiProvider } from "./types.js";

export function createNoneProvider(): AiProvider {
  return {
    name: "none",
    available: false,
    async extract(input: AiExtractInput): Promise<AiExtractResult> {
      return {
        provider: "none",
        model: null,
        ok: false,
        message: "AI chưa được bật — dùng bản nháp của parser và chỉnh tay.",
        defects: input.draft,
      };
    },
  };
}
