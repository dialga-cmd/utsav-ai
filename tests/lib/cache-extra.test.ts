import { describe, expect, it } from "vitest";
import { readCachedResponse, writeCachedResponse, clearAiCache } from "@/lib/ai/cache";

describe("ai cache", () => {
  it("works", () => {
    clearAiCache();
    const key = "k1";
    writeCachedResponse(key, "hello");
    expect(readCachedResponse(key)).toBe("hello");
    clearAiCache();
    expect(readCachedResponse(key)).toBeNull();
  });
});
