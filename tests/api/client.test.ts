/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractEvent, requestIdeas, requestVendorMessage } from "@/lib/api/client";
import { makeBrief } from "../factories";

/**
 * Build a minimal Response-like object for a successful AI payload.
 */
function mockResponse(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => payload,
  } as unknown as Response;
}

describe("lib/api/client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extractEvent validates the response against the extraction schema", async () => {
    const validExtraction = {
      eventType: "wedding",
      eventDate: "2026-12-15",
      guests: 120,
      budgetInr: 450_000,
      city: "Jaipur",
      notes: "",
      followUps: [],
      source: "fallback",
    };
    fetchMock.mockResolvedValueOnce(mockResponse(validExtraction));

    const result = await extractEvent("a wedding");
    expect(result).toEqual(validExtraction);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/extract",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "a wedding" }),
      }),
    );
  });

  it("extractEvent rejects a schema-invalid response", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ eventType: null, followUps: [] } as unknown as object),
    );
    await expect(extractEvent("test")).rejects.toThrow(
      "could not read the planning response",
    );
  });

  it("requestIdeas validates the response against the ideas schema", async () => {
    const validIdeas = {
      theme: "A warm wedding",
      menu: ["Vegetarian thali", "Chaat counter"],
      activities: ["Haldi games", "Sangeet"],
      decor: ["Marigold", "Brass lamps"],
      gifts: ["Diyas", "Sweet boxes"],
      savings: ["Trim ten guests", "Request package quotes"],
      source: "fallback",
    };
    fetchMock.mockResolvedValueOnce(mockResponse(validIdeas));

    const result = await requestIdeas(makeBrief(), null);
    expect(result.theme).toBe("A warm wedding");
  });

  it("requestIdeas rejects a schema-invalid response", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ theme: "x" } as unknown as object));
    await expect(requestIdeas(makeBrief(), null)).rejects.toThrow(
      /could not read the ideas response/,
    );
  });

  it("requestVendorMessage slices notes to 500 chars and validates the response", async () => {
    const longNotes = "x".repeat(600);
    const validMessage = {
      subject: "Venue enquiry for wedding on 15 Dec 2026",
      message:
        "Namaste, we are planning a wedding in Jaipur. Could you share availability, a quote and terms?",
      source: "fallback",
    };
    fetchMock.mockResolvedValueOnce(mockResponse(validMessage));

    const result = await requestVendorMessage(
      makeBrief(),
      "Venue or tent house",
      longNotes,
    );
    expect(result.subject).toBe(validMessage.subject);

    const call = fetchMock.mock.calls[0][1] as RequestInit;
    const sentBody = JSON.parse(String(call.body)) as { notes: string };
    expect(sentBody.notes).toHaveLength(500);
  });

  it("requestVendorMessage rejects a schema-invalid response", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ subject: "x" } as unknown as object));
    await expect(requestVendorMessage(makeBrief(), "Caterer", "notes")).rejects.toThrow(
      "could not read the draft",
    );
  });

  it("surfaces a generic error for HTTP failures", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ error: "Too many requests." }, false, 429),
    );
    await expect(extractEvent("test")).rejects.toThrow("Too many requests.");
  });

  it("uses a generic message when the error body has no string error field", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ broken: true }, false, 500));
    await expect(extractEvent("test")).rejects.toThrow("The request failed.");
  });

  it("aborts the fetch when the caller signal aborts", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("The request was aborted.", "AbortError"));
        });
      });
    });

    const promise = extractEvent("test", controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("times out after 20 seconds (fake timer)", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The request was aborted.", "AbortError"));
          });
        });
      });

      const promise = extractEvent("test");
      vi.advanceTimersByTime(20_500);
      await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    } finally {
      vi.useRealTimers();
    }
  });
});
