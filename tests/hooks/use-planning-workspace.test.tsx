/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { usePlanningWorkspace } from "@/hooks/usePlanningWorkspace";
import { makePlan } from "@/tests/plan-factory";
import * as storage from "@/lib/storage";
import type { ExtractedEvent } from "@/types/ai";

function validExtractedEvent(): ExtractedEvent {
  return {
    eventType: "wedding",
    eventDate: "2027-12-15",
    guests: 100,
    budgetInr: 400000,
    city: "Jaipur",
    notes: "Wedding in Jaipur",
    followUps: [],
    source: "ai",
  };
}

function fallbackExtractedEvent(): ExtractedEvent {
  return {
    eventType: "birthday",
    eventDate: "2027-10-10",
    guests: 30,
    budgetInr: 60000,
    city: "Mumbai",
    notes: "Birthday party in Mumbai",
    followUps: [],
    source: "fallback",
  };
}

function validIdeasResponse() {
  return {
    theme: "Courtyard wedding",
    menu: ["Vegetarian thali", "Chaat counter"],
    activities: ["Haldi games", "Sangeet run sheet"],
    decor: ["Marigold garlands", "Brass lamps"],
    gifts: ["Brass diyas", "Sweet boxes"],
    savings: ["Trim ten guests", "Package quotes"],
    source: "ai",
  };
}

describe("usePlanningWorkspace", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initialises with empty state when localStorage has no plan", () => {
    const { result } = renderHook(() => usePlanningWorkspace());
    expect(result.current.plan).toBeNull();
    expect(result.current.freeText).toBe("");
    expect(result.current.errors).toEqual({});
    expect(result.current.followUps).toEqual([]);
    expect(result.current.restoreNotice).toBeNull();
    expect(result.current.planNotice).toBeNull();
  });

  it("notifies when stored plan in localStorage was invalid", () => {
    vi.spyOn(storage, "loadStoredPlan").mockReturnValueOnce({
      status: "invalid",
    });
    const { result } = renderHook(() => usePlanningWorkspace());
    expect(result.current.plan).toBeNull();
    expect(result.current.restoreNotice).toContain("saved plan could not be read");
  });

  it("loads stored plan and detects if it is in the past", () => {
    const pastPlan = makePlan({
      brief: {
        eventType: "birthday",
        eventDate: "2020-01-01",
        guests: 20,
        budgetInr: 50000,
        city: "Delhi",
        cityTier: "metro",
        foodPreference: "veg",
        notes: "Old birthday",
        multiDay: false,
      },
      ideas: null,
    });
    vi.spyOn(storage, "loadStoredPlan").mockReturnValueOnce({
      status: "ok",
      plan: pastPlan,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify(validIdeasResponse()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const { result } = renderHook(() => usePlanningWorkspace());
    expect(result.current.plan).not.toBeNull();
    expect(result.current.planNotice).toMatchObject({
      tone: "warning",
      title: "This saved plan is in the past",
    });
  });

  it("handles successful extraction building a plan", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/extract")) {
        return new Response(JSON.stringify(validExtractedEvent()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/ideas")) {
        return new Response(JSON.stringify(validIdeasResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });

    const { result } = renderHook(() => usePlanningWorkspace());

    act(() => {
      result.current.handleFreeTextChange(
        "A grand wedding in Jaipur on 15 Dec 2027 with 100 guests and 400000 budget",
      );
    });
    expect(result.current.freeText).toBe(
      "A grand wedding in Jaipur on 15 Dec 2027 with 100 guests and 400000 budget",
    );

    await act(async () => {
      await result.current.handleExtract();
    });

    expect(result.current.plan).not.toBeNull();
    expect(result.current.plan?.brief.city).toBe("Jaipur");
    expect(result.current.plan?.brief.eventType).toBe("wedding");
  });

  it("handles AI-failure fallback path when extract returns fallback source", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/extract")) {
        return new Response(JSON.stringify(fallbackExtractedEvent()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/ideas")) {
        return new Response(JSON.stringify(validIdeasResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });

    const { result } = renderHook(() => usePlanningWorkspace());

    act(() => {
      result.current.handleFreeTextChange(
        "A birthday party in Mumbai on 2027-10-10 with 30 guests and 60000 budget",
      );
    });

    await act(async () => {
      await result.current.handleExtract();
    });

    expect(result.current.plan).not.toBeNull();
    expect(result.current.planNotice).not.toBeNull();
    expect(result.current.planNotice?.title).toContain("offline planner");
  });

  it("surfaces network error to UI when extract fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network connection lost"),
    );

    const { result } = renderHook(() => usePlanningWorkspace());

    act(() => {
      result.current.handleFreeTextChange(
        "A birthday party in Mumbai on 2027-10-10 with 30 guests and 60000 budget",
      );
    });

    await act(async () => {
      await result.current.handleExtract();
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.freeTextError).toContain("We could not read that note");
  });

  it("handles follow-up questions flow for missing fields during extraction", async () => {
    const partialExtracted: ExtractedEvent = {
      eventType: "wedding",
      eventDate: "2027-12-15",
      guests: null,
      budgetInr: null,
      city: "Jaipur",
      notes: "Need budget and guest count",
      followUps: [
        {
          field: "guests",
          question: "How many guests are you expecting?",
        },
      ],
      source: "ai",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify(partialExtracted), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const { result } = renderHook(() => usePlanningWorkspace());

    act(() => {
      result.current.handleFreeTextChange("A wedding in Jaipur in December 2027");
    });

    await act(async () => {
      await result.current.handleExtract();
    });

    // Missing critical fields populate followUps and do not build a plan yet
    expect(result.current.plan).toBeNull();
    expect(result.current.followUps.length).toBeGreaterThan(0);
    expect(result.current.followUps[0].field).toBe("guests");

    // Updating the field removes it from followUps
    act(() => {
      result.current.handleFieldChange("guests", "150");
    });
    expect(result.current.followUps).toHaveLength(0);
    expect(result.current.intake.guests).toBe("150");
  });

  it("aborts requests on unmount", () => {
    let aborted = false;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
      });
      return new Promise(() => {}); // never resolves
    });

    const { result, unmount } = renderHook(() => usePlanningWorkspace());

    act(() => {
      result.current.handleFreeTextChange(
        "A wedding in Delhi on 2027-11-11 for 100 guests budget 500000",
      );
    });

    void result.current.handleExtract();

    unmount();
    expect(aborted).toBe(true);
  });

  it("aborts ongoing extraction request on resubmit", () => {
    let abortCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      init?.signal?.addEventListener("abort", () => {
        abortCount++;
      });
      return new Promise(() => {}); // pending
    });

    const { result } = renderHook(() => usePlanningWorkspace());

    act(() => {
      result.current.handleFreeTextChange("First prompt with enough characters 12345");
    });

    void result.current.handleExtract();

    act(() => {
      result.current.handleFreeTextChange("Second prompt with enough characters 12345");
    });

    void result.current.handleExtract();

    expect(abortCount).toBeGreaterThanOrEqual(1);
  });

  it("surfaces validation errors to the UI when submitting empty form", () => {
    const { result } = renderHook(() => usePlanningWorkspace());
    act(() => {
      result.current.handleSubmit();
    });
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    expect(result.current.plan).toBeNull();
    expect(result.current.statusMessage).toContain("Check the highlighted fields");
  });

  it("surfaces error messages when freeText is too short", async () => {
    const { result } = renderHook(() => usePlanningWorkspace());
    act(() => {
      result.current.handleFreeTextChange("tiny");
    });
    await act(async () => {
      await result.current.handleExtract();
    });
    expect(result.current.freeTextError).toBe(
      "Add a little more detail, such as the event type, city or date.",
    );
  });

  it("supports idea refinement updating plan state", async () => {
    const plan = makePlan();
    vi.spyOn(storage, "loadStoredPlan").mockReturnValueOnce({
      status: "ok",
      plan,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/ideas")) {
        return new Response(
          JSON.stringify({
            ...validIdeasResponse(),
            theme: "Budget-friendly rustic courtyard",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });

    const { result } = renderHook(() => usePlanningWorkspace());
    expect(result.current.plan).not.toBeNull();

    await act(async () => {
      await result.current.handleRefine("cheaper");
    });

    expect(result.current.plan?.ideas?.theme).toBe("Budget-friendly rustic courtyard");
    expect(result.current.ideasStatus).toBe("idle");
  });

  it("supports example loading, demo, mutations, reset cycle, and print", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const { result } = renderHook(() => usePlanningWorkspace());

    // handleExample
    act(() => {
      result.current.handleExample("Loaded example text with many details");
    });
    expect(result.current.freeText).toBe("Loaded example text with many details");
    expect(result.current.statusMessage).toContain("Example loaded");

    // handleDemo
    act(() => {
      result.current.handleDemo();
    });
    expect(result.current.plan).not.toBeNull();
    const currentPlan = result.current.plan!;

    // plan mutations
    const catId = currentPlan.budget.categories[0].id;
    act(() => {
      result.current.handleBudgetPlannedChange(catId, 99999);
      result.current.handleBudgetActualChange(catId, 88888);
      result.current.handleToggleTask(currentPlan.timeline.tasks[0].id);
      result.current.handleVendorStatusChange(currentPlan.vendors[0].id, "contacted");
      result.current.handleVendorQuoteChange(currentPlan.vendors[0].id, 12345);
    });

    // handlePrint
    act(() => {
      result.current.handlePrint();
    });
    expect(printSpy).toHaveBeenCalled();

    // Reset flow: start over -> cancel -> confirm
    act(() => {
      result.current.handleStartOver();
    });
    expect(result.current.confirmReset).toBe(true);

    act(() => {
      result.current.handleCancelReset();
    });
    expect(result.current.confirmReset).toBe(false);

    act(() => {
      result.current.handleConfirmReset();
    });
    expect(result.current.plan).toBeNull();
    expect(result.current.confirmReset).toBe(false);
    expect(result.current.freeText).toBe("");
  });
});
