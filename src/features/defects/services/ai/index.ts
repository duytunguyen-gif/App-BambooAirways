/** Provider factory. Reads server-side env and returns the configured provider,
 *  falling back to the parser-only `none` provider when AI is off or unusable.
 *
 *  IMPORTANT: this must only run server-side (Vercel function / Node script).
 *  The Gemini key must NOT carry a VITE_ prefix, so it never reaches the client
 *  bundle. Do not import this module from browser code. */
import { createGeminiProvider } from "./geminiProvider";
import { createOpenAiProvider } from "./openaiProvider";
import { createNoneProvider } from "./noneProvider";
import type { AiProvider } from "./types";

export type AiEnv = {
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
};

export function getAiProvider(env: AiEnv = process.env as AiEnv): AiProvider {
  const provider = (env.AI_PROVIDER ?? "none").trim().toLowerCase();
  if (provider === "openai" && env.OPENAI_API_KEY) {
    return createOpenAiProvider({ apiKey: env.OPENAI_API_KEY, model: env.AI_MODEL });
  }
  if (provider === "gemini" && env.GEMINI_API_KEY) {
    return createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.AI_MODEL });
  }
  return createNoneProvider();
}

export * from "./types";
export { createGeminiProvider } from "./geminiProvider";
export { createOpenAiProvider } from "./openaiProvider";
export { createNoneProvider } from "./noneProvider";
export {
  buildUserPrompt,
  parseAiResponse,
  SYSTEM_INSTRUCTION,
  RESPONSE_SCHEMA,
} from "./prompt";
