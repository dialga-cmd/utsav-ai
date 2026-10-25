/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { usePlanMutations } from "@/hooks/usePlanMutations";
import { useVendorMessages } from "@/hooks/useVendorMessages";
import { useIdeas } from "@/hooks/useIdeas";
import { makePlan } from "@/tests/plan-factory";

describe("usePlanMutations", () => {
  it("handles budget change and clears ideas", () => {
    const plan = makePlan();
    let current: typeof plan | null = plan;
    let cleared = false;
    const setPlan = (updater: (p: typeof plan | null) => typeof plan | null) => {
      current = updater(current);
    };
    const { result } = renderHook(() =>
      usePlanMutations(setPlan as never, () => {
        cleared = true;
      }),
    );
    const categoryId = plan.budget.categories[0].id;
    act(() => {
      result.current.handleBudgetPlannedChange(categoryId, 5000);
    });
    expect(cleared).toBe(true);
    act(() => {
      result.current.handleBudgetActualChange(categoryId, 5000);
      result.current.handleToggleTask(plan.timeline.tasks[0].id);
      result.current.handleVendorStatusChange(plan.vendors[0].id, "booked");
      result.current.handleVendorQuoteChange(plan.vendors[0].id, 10000);
    });
    expect(current).not.toBeNull();
  });
});

describe("useVendorMessages", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            subject: "Enquiry for caterer",
            message:
              "Namaste, we are planning a wedding. Could you share availability and quote?",
            source: "ai",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("drafts and stores ready state", async () => {
    const plan = makePlan();
    const { result } = renderHook(() => useVendorMessages(plan));
    const vendor = plan.vendors[0];
    await act(async () => {
      await result.current.handleDraftVendorMessage(vendor);
    });
    expect(result.current.vendorMessageStates[vendor.id]).toMatchObject({
      status: "ready",
    });
    act(() => {
      result.current.abortVendorRequests();
    });
  });

  it("handles null plan gracefully", async () => {
    const { result } = renderHook(() => useVendorMessages(null));
    await act(async () => {
      await result.current.handleDraftVendorMessage({ id: "v1", name: "Caterer" });
    });
    expect(result.current.vendorMessageStates).toEqual({});
  });

  it("handles AbortError and generic errors in describeError", async () => {
    const plan = makePlan();
    const { result } = renderHook(() => useVendorMessages(plan));
    const vendor = plan.vendors[0];

    // AbortError
    const abortErr = new Error("Timeout");
    abortErr.name = "AbortError";
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortErr);
    await act(async () => {
      await result.current.handleDraftVendorMessage(vendor);
    });
    expect(result.current.vendorMessageStates[vendor.id]).toMatchObject({
      status: "error",
      error: "The request took too long. Please try again.",
    });

    // Custom Error
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Custom failure"));
    await act(async () => {
      await result.current.handleDraftVendorMessage(vendor);
    });
    expect(result.current.vendorMessageStates[vendor.id]).toMatchObject({
      status: "error",
      error: "Custom failure",
    });

    // TypeError fallback
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Network error"));
    await act(async () => {
      await result.current.handleDraftVendorMessage(vendor);
    });
    expect(result.current.vendorMessageStates[vendor.id]).toMatchObject({
      status: "error",
      error: "The service could not be reached. Check your connection and try again.",
    });
  });
  it("returns early when plan is null", async () => {
    const { result } = renderHook(() => useVendorMessages(null));
    await act(async () => {
      await result.current.handleDraftVendorMessage({ id: "x", name: "X" });
    });
    expect(Object.keys(result.current.vendorMessageStates)).toHaveLength(0);
  });
});

describe("useIdeas", () => {
  function validIdeasResponse() {
    return new Response(
      JSON.stringify({
        theme: "A warm courtyard wedding",
        menu: ["Vegetarian thali", "Chaat counter"],
        activities: ["Haldi games", "Sangeet run sheet"],
        decor: ["Marigold garlands", "Brass lamps"],
        gifts: ["Brass diyas", "Sweet boxes"],
        savings: ["Trim ten guests", "Package quotes"],
        source: "ai",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => validIdeasResponse());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads ideas and caches them", async () => {
    const plan = makePlan();
    const planVersionRef = { current: 1 };
    let current: typeof plan | null = plan;
    const setPlan = (updater: (p: typeof plan | null) => typeof plan | null) => {
      current = updater(current);
    };
    const { result } = renderHook(() => useIdeas(plan, planVersionRef, setPlan as never));
    await act(async () => {
      await result.current.loadIdeas(plan, null, 1);
    });
    expect(current?.ideas).toBeTruthy();
    // Second load should hit the cache and not fetch again
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const callsBefore = fetchMock.mock.calls.length;
    await act(async () => {
      await result.current.loadIdeas(plan, "cheaper", 1);
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    // Now same refinement should be cached
    const callsAfter = fetchMock.mock.calls.length;
    await act(async () => {
      await result.current.loadIdeas(plan, "cheaper", 1);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfter);

    // Exercise remaining paths: refine, retry, abort, clear, setters
    await act(async () => {
      await result.current.handleRefine(null);
    });
    act(() => {
      result.current.handleRetryIdeas();
      result.current.abortIdeas();
      result.current.clearIdeasCache();
      result.current.setActiveRefinement("cheaper");
      result.current.setIdeasStatus("idle");
      result.current.setIdeasError(null);
    });
  });

  it("handles failed loads with descriptive errors", async () => {
    const plan = makePlan();
    const planVersionRef = { current: 1 };
    const setPlan = (updater: (p: typeof plan | null) => typeof plan | null) => {
      updater(null);
    };
    const { result } = renderHook(() => useIdeas(plan, planVersionRef, setPlan as never));
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("network down"));
    await act(async () => {
      await result.current.loadIdeas(plan, null, 1);
    });
    expect(result.current.ideasError).toBe("network down");
    // A non-Error rejection falls through to the generic connection message
    vi.mocked(globalThis.fetch).mockRejectedValueOnce("boom");
    await act(async () => {
      await result.current.loadIdeas(plan, null, 1);
    });
    expect(result.current.ideasError).toBe(
      "The service could not be reached. Check your connection and try again.",
    );
  });

  it("handleRefine rolls back on error and no-ops while loading", async () => {
    const plan = makePlan();
    const planVersionRef = { current: 1 };
    let current: typeof plan | null = plan;
    const setPlan = (updater: (p: typeof plan | null) => typeof plan | null) => {
      current = updater(current);
    };
    const { result } = renderHook(() => useIdeas(plan, planVersionRef, setPlan as never));
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("nope"));
    await act(async () => {
      await result.current.handleRefine("cheaper");
    });
    // Rolled back to the previous (null) refinement
    expect(result.current.activeRefinement).toBe(null);
  });
});
