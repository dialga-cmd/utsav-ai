import { describe, expect, it, vi } from "vitest";
import { extractEventDetails, generateIdeas, draftVendorMessage } from "@/lib/ai/service";
import { clearAiCache } from "@/lib/ai/cache";
import { makeBrief } from "@/tests/factories";

describe("ai service with provider injection", () => {
  it("uses the provider when given", async () => {
    clearAiCache();
    const fakeProvider = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          eventType: "birthday",
          eventDate: "2027-06-01",
          guests: 50,
          budgetInr: 300000,
          city: "Pune",
        }),
      ),
    };
    const res = await extractEventDetails("A birthday in Pune", {
      provider: fakeProvider,
    });
    expect(res.source).toBe("ai");
    expect(res.eventType).toBe("birthday");
  });

  it("falls back when provider throws", async () => {
    clearAiCache();
    const fakeProvider = {
      complete: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const res = await extractEventDetails("A birthday in Pune", {
      provider: fakeProvider,
    });
    expect(res.source).toBe("fallback");
  });

  it("generateIdeas uses provider", async () => {
    clearAiCache();
    const fakeProvider = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          theme: "A birthday theme",
          menu: ["Vegetarian thali", "Chaat counter"],
          activities: ["Haldi games", "Sangeet run sheet"],
          decor: ["Marigold garlands", "Brass lamps"],
          gifts: ["Brass diyas", "Sweet boxes"],
          savings: ["Trim ten guests", "Package quotes"],
        }),
      ),
    };
    const res = await generateIdeas(makeBrief(), null, { provider: fakeProvider });
    expect(res.source).toBe("ai");
  });

  it("generateIdeas falls back on provider error", async () => {
    clearAiCache();
    const fakeProvider = {
      complete: vi.fn().mockRejectedValue(new Error("down")),
    };
    const res = await generateIdeas(makeBrief(), null, { provider: fakeProvider });
    expect(res.source).toBe("fallback");
  });

  it("draftVendorMessage uses provider", async () => {
    clearAiCache();
    const fakeProvider = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          subject: "Enquiry",
          message:
            "Namaste, we are planning a wedding. Please share your quote and terms.",
        }),
      ),
    };
    const res = await draftVendorMessage(makeBrief(), "Caterer", "notes", {
      provider: fakeProvider,
    });
    expect(res.source).toBe("ai");
    expect(res.subject).toBe("Enquiry");
  });

  it("draftVendorMessage falls back on provider error", async () => {
    clearAiCache();
    const fakeProvider = {
      complete: vi.fn().mockRejectedValue(new Error("err")),
    };
    const res = await draftVendorMessage(makeBrief(), "Caterer", "notes", {
      provider: fakeProvider,
    });
    expect(res.source).toBe("fallback");
  });
});
