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

  it("handles cache expiration and eviction at capacity", () => {
    clearAiCache();
    const key = "k-expire";
    const now = 1_000_000;
    writeCachedResponse(key, "temp-value", now);
    expect(readCachedResponse(key, now + 1000)).toBe("temp-value");
    // Expired after 5 minutes
    expect(readCachedResponse(key, now + 6 * 60 * 1000)).toBeNull();

    // Capacity eviction
    clearAiCache();
    for (let i = 0; i < 105; i++) {
      writeCachedResponse(`key-${i}`, `val-${i}`, now);
    }
    // Oldest entries (key-0 to key-4) should have been evicted
    expect(readCachedResponse("key-0", now)).toBeNull();
    expect(readCachedResponse("key-104", now)).toBe("val-104");
  });
});
