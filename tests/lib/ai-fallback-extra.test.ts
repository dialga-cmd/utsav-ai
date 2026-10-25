import { describe, expect, it } from "vitest";
import { extractEventDetails } from "@/lib/ai/service";

describe("ai service/fallback", () => {
  it("extracts with fallback when no provider", async () => {
    const res = await extractEventDetails(
      "Wedding in Jaipur on 15 Dec 2026 for 120 guests with budget 450000",
    );
    expect(res.eventType).toBe("wedding");
    expect(res.source).toBeDefined();
  });
});
