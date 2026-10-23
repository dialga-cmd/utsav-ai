import { z } from "zod";

const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 2_048;

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })).min(1),
        }),
      }),
    )
    .min(1),
});

export interface CompletionRequest {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Small provider boundary so routes and tests do not depend on Gemini details. */
export interface AiProvider {
  complete(request: CompletionRequest): Promise<string>;
}

interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

class GeminiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_GEMINI_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async complete(request: CompletionRequest): Promise<string> {
    const endpoint = `${GEMINI_API_ROOT}/${encodeURIComponent(this.model)}:generateContent`;

    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: request.system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: request.prompt }],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.5,
          maxOutputTokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error("AI provider request failed.");
    }

    const payload: unknown = await response.json();
    const parsed = geminiResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("AI provider returned an unexpected response.");
    }

    const text = parsed.data.candidates[0].content.parts
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) throw new Error("AI provider returned an empty response.");
    return text;
  }
}

/** Build the Gemini provider from server-only environment variables. */
export function createGeminiProvider(options: GeminiProviderOptions): AiProvider {
  return new GeminiProvider(options);
}

/** Return a configured provider, or null so callers can use curated fallbacks. */
export function getAiProvider(): AiProvider | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  return createGeminiProvider({
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  });
}
