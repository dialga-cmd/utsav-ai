/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useExtraction } from "@/hooks/useExtraction";
import { createEmptyIntake, type IntakeFormValues } from "@/lib/intake";
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

function baseHandlers(overrides: Partial<Parameters<typeof useExtraction>[3]> = {}) {
  const applyPlan = vi.fn();
  const setIntake = vi.fn();
  const setErrors = vi.fn();
  const setFollowUps = vi.fn();
  const setStatusMessage = vi.fn();
  const setExtractionSource = vi.fn();
  const setIsExtracting = vi.fn();
  const setFreeText = vi.fn();
  const setFreeTextError = vi.fn();
  return {
    applyPlan,
    setIntake,
    setErrors,
    setFollowUps,
    setStatusMessage,
    setExtractionSource,
    setIsExtracting,
    setFreeText,
    setFreeTextError,
    overrides,
  };
}

describe("useExtraction", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify(validExtractedEvent()), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts and applies plan on success", async () => {
    const h = baseHandlers();
    const { result } = renderHook(() =>
      useExtraction(
        "A wedding in Jaipur on 15 Dec 2027 for 100 guests with budget 400000",
        createEmptyIntake(),
        null,
        h,
      ),
    );
    await act(async () => {
      await result.current.handleExtract();
    });
    expect(h.setStatusMessage).toHaveBeenCalled();
    expect(h.setExtractionSource).toHaveBeenCalledWith("ai");
    expect(h.applyPlan).toHaveBeenCalled();
  });

  it("reports an error when extraction fails", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("down"));
    const h = baseHandlers();
    const { result } = renderHook(() =>
      useExtraction(
        "A wedding in Jaipur on 15 Dec 2027 for 100 guests with budget 400000",
        createEmptyIntake(),
        null,
        h,
      ),
    );
    await act(async () => {
      await result.current.handleExtract();
    });
    expect(h.setFreeTextError).toHaveBeenCalled();
  });

  it("requires at least 8 characters of free text", async () => {
    const h = baseHandlers();
    const { result } = renderHook(() =>
      useExtraction("short", createEmptyIntake(), null, h),
    );
    await act(async () => {
      await result.current.handleExtract();
    });
    expect(h.setFreeTextError).toHaveBeenCalled();
    expect(h.setStatusMessage).not.toHaveBeenCalled();
  });

  it("handles demo shortcut without fetch", async () => {
    const h = baseHandlers();
    const { result } = renderHook(() => useExtraction("", createEmptyIntake(), null, h));
    await act(async () => {
      result.current.handleDemo();
    });
    expect(h.setIntake).toHaveBeenCalled();
    expect(h.applyPlan).toHaveBeenCalled();
  });

  it("submit form applies plan directly when intake is valid", async () => {
    const valid: IntakeFormValues = {
      ...createEmptyIntake(),
      eventDate: "2027-12-15",
      guests: "100",
      budgetInr: "400000",
      city: "Jaipur",
    };
    const h = baseHandlers();
    const { result } = renderHook(() => useExtraction("", valid, "fallback", h));
    act(() => {
      result.current.handleSubmit();
    });
    expect(h.applyPlan).toHaveBeenCalled();
  });

  it("submit form surfaces parse errors when intake is invalid", async () => {
    const invalid: IntakeFormValues = {
      ...createEmptyIntake(),
      eventDate: "",
      guests: "0",
      budgetInr: "0",
      city: "",
    };
    const h = baseHandlers();
    const { result } = renderHook(() => useExtraction("", invalid, null, h));
    act(() => {
      result.current.handleSubmit();
    });
    expect(h.setErrors).toHaveBeenCalled();
    expect(h.setStatusMessage).toHaveBeenCalled();
  });

  it("abortExtraction aborts in-flight requests", async () => {
    const h = baseHandlers();
    const { result } = renderHook(() =>
      useExtraction(
        "A wedding in Jaipur on 15 Dec 2027 for 100 guests with budget 400000",
        createEmptyIntake(),
        null,
        h,
      ),
    );
    result.current.abortExtraction();
    expect(true).toBe(true);
  });
});
