/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlanPersistence } from "@/hooks/usePlanPersistence";
import { makePlan } from "@/tests/plan-factory";

describe("usePlanPersistence flush paths", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("flushes on pagehide", () => {
    const plan = makePlan();
    renderHook(() => usePlanPersistence(plan, 100_000));
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(localStorage.getItem("utsav-ai.plan.v1")).toBeTruthy();
  });

  it("reports saved status after debounce", async () => {
    const plan = makePlan();
    const { result } = renderHook(() => usePlanPersistence(plan, 10));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current).toBe("saved");
  });

  it("returns idle when plan is null", () => {
    const { result } = renderHook(() => usePlanPersistence(null));
    expect(result.current).toBe("idle");
  });
});
