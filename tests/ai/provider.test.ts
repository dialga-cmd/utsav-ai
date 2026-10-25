import { describe, expect, it, vi } from "vitest";
import { createGeminiProvider } from "@/lib/ai/provider";

describe("Gemini provider", () => {
  it("sends the key in a header, never the URL, and parses text", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const provider = createGeminiProvider({
      apiKey: "test-key",
      model: "gemini-test",
      fetchImpl,
    });
    const result = await provider.complete({
      system: "Return JSON.",
      prompt: "Hello",
      temperature: 0.2,
    });

    expect(result).toBe('{"ok":true}');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("gemini-test:generateContent");
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    expect(String(init.body)).toContain("Return JSON.");
  });

  it("throws a generic error for provider failures", async () => {
    const provider = createGeminiProvider({
      apiKey: "test-key",
      fetchImpl: async () => new Response("upstream details", { status: 500 }),
    });

    await expect(provider.complete({ system: "s", prompt: "p" })).rejects.toThrow(
      "AI provider request failed.",
    );
  });

  it("rejects malformed provider payloads", async () => {
    const provider = createGeminiProvider({
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    });

    await expect(provider.complete({ system: "s", prompt: "p" })).rejects.toThrow(
      "unexpected response",
    );
  });
});
