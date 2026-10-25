/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEY,
  loadStoredPlan,
  saveStoredPlan,
  clearStoredPlan,
} from "@/lib/storage";
import { testPlan } from "./utils";

// A minimal in-memory Storage implementation for testing.
class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("lib/storage", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("returns empty when nothing is stored", () => {
    const result = loadStoredPlan(storage);
    expect(result).toEqual({ status: "empty" });
  });

  it("round-trips a valid plan", () => {
    const plan = testPlan();
    const saved = saveStoredPlan(plan, storage);
    expect(saved).toBe(true);

    const loaded = loadStoredPlan(storage);
    expect(loaded.status).toBe("ok");
    if (loaded.status === "ok") {
      expect(loaded.plan.brief.city).toBe(plan.brief.city);
      expect(loaded.plan.brief.budgetInr).toBe(plan.brief.budgetInr);
      expect(loaded.plan.timeline.tasks).toEqual(plan.timeline.tasks);
      expect(loaded.plan.vendors).toEqual(plan.vendors);
      expect(loaded.plan.ideas).toEqual(plan.ideas);
    }
  });

  it("returns invalid and removes the key for malformed data", () => {
    storage.setItem(STORAGE_KEY, "not json at all");
    const result = loadStoredPlan(storage);
    expect(result.status).toBe("invalid");
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns invalid and removes the key for wrong version", () => {
    const plan = testPlan();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, plan }));
    const result = loadStoredPlan(storage);
    expect(result.status).toBe("invalid");
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns invalid for a plan missing required fields", () => {
    const plan = testPlan();
    const broken = {
      version: 1,
      plan: { ...plan, vendors: [] },
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(broken));
    const result = loadStoredPlan(storage);
    expect(result.status).toBe("invalid");
  });

  it("clearStoredPlan removes the stored value", () => {
    const plan = testPlan();
    saveStoredPlan(plan, storage);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    clearStoredPlan(storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("saveStoredPlan returns false when storage is null", () => {
    const plan = testPlan();
    expect(saveStoredPlan(plan, null)).toBe(false);
  });

  it("loadStoredPlan returns empty when storage is null", () => {
    expect(loadStoredPlan(null)).toEqual({ status: "empty" });
  });

  it("returns invalid for a plan with an invalid event date", () => {
    const plan = testPlan();
    const broken = {
      version: 1,
      plan: {
        ...plan,
        brief: { ...plan.brief, eventDate: "not-a-date" },
      },
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(broken));
    const result = loadStoredPlan(storage);
    expect(result.status).toBe("invalid");
  });

  it("preserves budget edits through a round-trip", () => {
    const plan = testPlan();
    const edited = {
      ...plan,
      budget: {
        ...plan.budget,
        categories: plan.budget.categories.map((c, i) =>
          i === 0 ? { ...c, plannedInr: c.plannedInr + 50_000, actualInr: 12_000 } : c,
        ),
      },
    };
    saveStoredPlan(edited, storage);
    const loaded = loadStoredPlan(storage);
    expect(loaded.status).toBe("ok");
    if (loaded.status === "ok") {
      const firstCat = loaded.plan.budget.categories[0];
      expect(firstCat.plannedInr).toBe(plan.budget.categories[0].plannedInr + 50_000);
      expect(firstCat.actualInr).toBe(12_000);
    }
  });

  it("preserves vendor status and quote through a round-trip", () => {
    const plan = testPlan();
    const vendorId = plan.vendors[0].id;
    const edited = {
      ...plan,
      vendors: plan.vendors.map((v) =>
        v.id === vendorId ? { ...v, status: "quoted" as const, quoteInr: 85_000 } : v,
      ),
    };
    saveStoredPlan(edited, storage);
    const loaded = loadStoredPlan(storage);
    expect(loaded.status).toBe("ok");
    if (loaded.status === "ok") {
      const vendor = loaded.plan.vendors.find((v) => v.id === vendorId)!;
      expect(vendor.status).toBe("quoted");
      expect(vendor.quoteInr).toBe(85_000);
    }
  });

  it("preserves task done state through a round-trip", () => {
    const plan = testPlan();
    const taskId = plan.timeline.tasks[0].id;
    const edited = {
      ...plan,
      timeline: {
        ...plan.timeline,
        tasks: plan.timeline.tasks.map((t) =>
          t.id === taskId ? { ...t, done: true } : t,
        ),
      },
    };
    saveStoredPlan(edited, storage);
    const loaded = loadStoredPlan(storage);
    expect(loaded.status).toBe("ok");
    if (loaded.status === "ok") {
      const task = loaded.plan.timeline.tasks.find((t) => t.id === taskId)!;
      expect(task.done).toBe(true);
    }
  });
});
