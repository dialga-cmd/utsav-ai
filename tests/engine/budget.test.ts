import { describe, expect, it } from "vitest";
import { allocateAmounts, buildBudget, getBudgetTier } from "@/lib/engine/budget";
import { makeBrief } from "@/tests/factories";

describe("allocateAmounts", () => {
  it("allocates the exact total with largest remainders", () => {
    expect(allocateAmounts(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateAmounts(101, [1, 1, 1])).toEqual([34, 34, 33]);
    expect(allocateAmounts(100, [1, 1, 1]).reduce((sum, amount) => sum + amount, 0)).toBe(
      100,
    );
  });

  it("handles zero, tiny and mixed weights", () => {
    expect(allocateAmounts(0, [1, 2])).toEqual([0, 0]);
    expect(allocateAmounts(1, [1, 1])).toEqual([1, 0]);
    expect(allocateAmounts(7, [0, 1, 0])).toEqual([0, 7, 0]);
    expect(allocateAmounts(3, [0, 0])).toEqual([2, 1]);
  });
});

describe("getBudgetTier", () => {
  it("classifies budgets by spend per guest", () => {
    expect(getBudgetTier(60_000, 100)).toBe("economy");
    expect(getBudgetTier(200_000, 100)).toBe("standard");
    expect(getBudgetTier(500_000, 100)).toBe("premium");
  });

  it("uses total budget when guests are unknown", () => {
    expect(getBudgetTier(40_000, 0)).toBe("economy");
    expect(getBudgetTier(100_000, 0)).toBe("standard");
    expect(getBudgetTier(300_000, 0)).toBe("premium");
  });
});

describe("buildBudget", () => {
  it.each(["wedding", "birthday", "community"] as const)(
    "always sums %s categories to the whole budget",
    (eventType) => {
      for (const budgetInr of [0, 1, 7, 999, 450_000, 100_000_000]) {
        const result = buildBudget(makeBrief({ eventType, budgetInr }));
        const sum = result.categories.reduce(
          (total, category) => total + category.plannedInr,
          0,
        );

        expect(sum).toBe(result.totalInr);
        expect(Number.isInteger(sum)).toBe(true);
        expect(result.categories.every((category) => category.plannedInr >= 0)).toBe(
          true,
        );
      }
    },
  );

  it("clamps negative and excessive budgets", () => {
    expect(buildBudget(makeBrief({ budgetInr: -50 })).totalInr).toBe(0);
    expect(buildBudget(makeBrief({ budgetInr: 999_999_999 })).totalInr).toBe(100_000_000);
  });

  it("handles zero guests without dividing by zero", () => {
    const result = buildBudget(makeBrief({ guests: 0, budgetInr: 100_000 }));
    expect(result.perGuestInr).toBe(0);
    expect(result.categories.some((category) => category.plannedInr > 0)).toBe(true);
  });

  it("shifts more budget to catering for large guest counts", () => {
    const small = buildBudget(makeBrief({ guests: 40, budgetInr: 1_000_000 }));
    const large = buildBudget(makeBrief({ guests: 400, budgetInr: 1_000_000 }));
    const smallFood = small.categories.find((item) => item.id === "catering");
    const largeFood = large.categories.find((item) => item.id === "catering");

    expect(largeFood?.sharePct ?? 0).toBeGreaterThan(smallFood?.sharePct ?? 0);
  });

  it("raises venue allocation in metros versus tier 3 cities", () => {
    const metro = buildBudget(makeBrief({ cityTier: "metro" }));
    const tier3 = buildBudget(makeBrief({ cityTier: "tier3" }));
    const metroVenue = metro.categories.find((item) => item.id === "venue");
    const tier3Venue = tier3.categories.find((item) => item.id === "venue");

    expect(metroVenue?.plannedInr ?? 0).toBeGreaterThan(tier3Venue?.plannedInr ?? 0);
  });

  it("adjusts catering for multi-day, premium and non-veg plans", () => {
    const base = buildBudget(makeBrief({ multiDay: false, foodPreference: "veg" }));
    const upgraded = buildBudget(
      makeBrief({ multiDay: true, foodPreference: "non_veg", guests: 250 }),
    );
    const baseFood = base.categories.find((item) => item.id === "catering");
    const upgradedFood = upgraded.categories.find((item) => item.id === "catering");

    expect(upgradedFood?.plannedInr ?? 0).toBeGreaterThan(baseFood?.plannedInr ?? 0);
  });

  it("provides stable guidance for every category", () => {
    const result = buildBudget(makeBrief());
    expect(result.categories).toHaveLength(10);
    expect(result.categories.every((category) => category.guidance.length > 10)).toBe(
      true,
    );
  });
});
