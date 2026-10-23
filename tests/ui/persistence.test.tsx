/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { usePlanPersistence, PLAN_SAVE_DEBOUNCE_MS } from "@/hooks/usePlanPersistence";
import { testPlan } from "./utils";

/**
 * Because the hook's internal call to saveStoredPlan is a live ESM import,
 * we intercept at the localStorage level instead of the module level.
 */
function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    _store: store,
  };
}

describe("usePlanPersistence", () => {
  let mockStorage: ReturnType<typeof createMockLocalStorage>;
  let originalLocal: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = createMockLocalStorage();
    originalLocal = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "localStorage", {
      value: originalLocal,
      writable: true,
      configurable: true,
    });
  });

  it("returns 'idle' when plan is null", () => {
    const { result } = renderHook(() => usePlanPersistence(null));
    expect(result.current).toBe("idle");
  });

  it("returns 'saving' immediately after a plan is set", () => {
    const plan = testPlan();
    const { result } = renderHook(({ plan: p }) => usePlanPersistence(p), {
      initialProps: { plan },
    });

    expect(result.current).toBe("saving");
  });

  it("returns 'saved' after the debounce delay expires", () => {
    const plan = testPlan();
    const { result } = renderHook(({ plan: p }) => usePlanPersistence(p), {
      initialProps: { plan },
    });

    expect(result.current).toBe("saving");

    act(() => {
      vi.advanceTimersByTime(PLAN_SAVE_DEBOUNCE_MS + 50);
    });

    expect(result.current).toBe("saved");
    // The plan should have been written to localStorage under the storage key
    expect(mockStorage._store.has("utsav-ai.plan.v1")).toBe(true);
    const stored = JSON.parse(mockStorage._store.get("utsav-ai.plan.v1")!);
    expect(stored.version).toBe(1);
    expect(stored.plan.brief.city).toBe(plan.brief.city);
  });

  it("returns 'failed' when localStorage.setItem throws", () => {
    const plan = testPlan();
    const { result } = renderHook(({ plan: p }) => usePlanPersistence(p), {
      initialProps: { plan },
    });

    // Make setItem throw to simulate a quota / private-mode failure
    mockStorage.setItem = () => {
      throw new Error("Quota exceeded");
    };

    act(() => {
      vi.advanceTimersByTime(PLAN_SAVE_DEBOUNCE_MS + 50);
    });

    expect(result.current).toBe("failed");
  });

  it("does not save the previous plan if a new plan arrives before the debounce expires", () => {
    const planV1 = testPlan();
    const planV2 = testPlan();

    const { result, rerender } = renderHook(({ plan: p }) => usePlanPersistence(p), {
      initialProps: { plan: planV1 },
    });

    expect(result.current).toBe("saving");

    // Change the plan before the timer fires
    act(() => {
      rerender({ plan: planV2 });
    });

    expect(result.current).toBe("saving");

    act(() => {
      vi.advanceTimersByTime(PLAN_SAVE_DEBOUNCE_MS + 50);
    });

    expect(result.current).toBe("saved");
    const stored = JSON.parse(mockStorage._store.get("utsav-ai.plan.v1")!);
    // planV2 was written; planV1's timer was cancelled by the effect cleanup
    expect(stored.plan.brief.city).toBe(planV2.brief.city);
  });

  it("calls saveStoredPlan exactly once per settled plan change", () => {
    const plan = testPlan();
    const { rerender } = renderHook(({ plan: p }) => usePlanPersistence(p), {
      initialProps: { plan },
    });

    act(() => {
      vi.advanceTimersByTime(PLAN_SAVE_DEBOUNCE_MS + 50);
    });

    expect(mockStorage._store.size).toBe(1);

    const plan2 = testPlan();
    act(() => {
      rerender({ plan: plan2 });
      vi.advanceTimersByTime(PLAN_SAVE_DEBOUNCE_MS + 50);
    });

    // Still one key, but the value was overwritten
    expect(mockStorage._store.size).toBe(1);
    const stored = JSON.parse(mockStorage._store.get("utsav-ai.plan.v1")!);
    expect(stored.plan.brief.city).toBe(plan2.brief.city);
  });
});
