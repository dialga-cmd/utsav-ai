import { describe, expect, it } from "vitest";
import { createGeminiProvider, getAiProvider } from "@/lib/ai/provider";

describe("gemini provider", () => {
  it("getAiProvider returns null when no key is set", () => {
    delete process.env.GEMINI_API_KEY;
    const provider = getAiProvider();
    expect(provider).toBeNull();
  });

  it("getAiProvider returns a provider when a key is set", () => {
    process.env.GEMINI_API_KEY = "test-key";
    const provider = getAiProvider();
    expect(provider).not.toBeNull();
  });

  it("createGeminiProvider works with a mocked fetch", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"foo": "bar"}' }] } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const provider = createGeminiProvider({
      apiKey: "key",
      model: "gemini-3.5-flash",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    const result = await provider.complete({
      system: "s",
      prompt: "p",
      temperature: 0.5,
      maxOutputTokens: 100,
    });
    expect(result).toContain("foo");
  });

  it("provider throws when response is not ok", async () => {
    const mockFetch = async () => new Response(null, { status: 500 });
    const provider = createGeminiProvider({
      apiKey: "key",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    await expect(provider.complete({ system: "s", prompt: "p" })).rejects.toThrow();
  });

  it("provider throws when payload is empty", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [] } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const provider = createGeminiProvider({
      apiKey: "key",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    await expect(provider.complete({ system: "s", prompt: "p" })).rejects.toThrow();
  });
});
