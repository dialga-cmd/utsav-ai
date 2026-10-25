import { describe, expect, it, vi } from "vitest";
import { extractEvent, requestIdeas, requestVendorMessage } from "@/lib/api/client";
import { makeBrief } from "@/tests/factories";

function jsonResponse(obj: unknown) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("api client", () => {
  it("extractEvent returns validated data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        eventType: "wedding",
        eventDate: "2027-12-15",
        guests: 100,
        budgetInr: 400000,
        city: "Jaipur",
        notes: "a note",
        followUps: [],
        source: "ai",
      }),
    );
    const res = await extractEvent("Wedding in Jaipur");
    expect(res.eventType).toBe("wedding");
  });

  it("extractEvent throws on invalid payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ broken: true }));
    await expect(extractEvent("Wedding in Jaipur")).rejects.toThrow();
  });

  it("requestIdeas returns validated data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        theme: "A warm theme",
        menu: ["Vegetarian thali", "Chaat counter"],
        activities: ["Haldi games", "Sangeet run sheet"],
        decor: ["Marigold garlands", "Brass lamps"],
        gifts: ["Brass diyas", "Sweet boxes"],
        savings: ["Trim ten guests", "Package quotes"],
        source: "ai",
      }),
    );
    const res = await requestIdeas(makeBrief(), null);
    expect(res.source).toBe("ai");
  });

  it("requestVendorMessage returns validated data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        subject: "Enquiry for caterer",
        message:
          "Namaste, we are planning a wedding. Could you share availability and a quote?",
        source: "fallback",
      }),
    );
    const res = await requestVendorMessage(makeBrief(), "Caterer", "notes");
    expect(res.subject).toBe("Enquiry for caterer");
  });

  it("postJson throws on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(extractEvent("Wedding")).rejects.toThrow();
  });

  it("aborts when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const res = extractEvent("Wedding", controller.signal);
    await expect(res).rejects.toThrow();
  });
});
