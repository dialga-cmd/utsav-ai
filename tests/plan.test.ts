import { describe, it, expect } from "vitest";
import {
  createPlanSnapshot,
  setBudgetPlanned,
  setBudgetActual,
  toggleTimelineTask,
  setVendorStatus,
  setVendorQuote,
  getPlanTotals,
  MAX_BUDGET_INR,
} from "@/lib/plan";
import { makeBrief } from "./factories";
import type { PlanSnapshot } from "@/types/plan";

const NOW = new Date("2026-01-15T00:00:00.000Z");

function makePlan(): PlanSnapshot {
  const result = createPlanSnapshot(makeBrief(), NOW);
  if (!result.ok) throw new Error("Failed to create plan");
  return result.plan;
}

function firstCategoryId(plan: PlanSnapshot): string {
  return plan.budget.categories[0].id;
}

describe("lib/plan", () => {
  it("createPlanSnapshot builds a valid plan from a future brief", () => {
    const result = createPlanSnapshot(makeBrief(), NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.brief.budgetInr).toBe(450_000);
      expect(result.plan.ideas).toBeNull();
      expect(result.plan.vendors.length).toBeGreaterThan(0);
      expect(result.plan.timeline.tasks.length).toBeGreaterThan(0);
    }
  });

  it("createPlanSnapshot rejects a past brief with an error", () => {
    const result = createPlanSnapshot({ ...makeBrief(), eventDate: "2020-01-01" }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it("setBudgetPlanned updates the category and recalculates totals", () => {
    const plan = makePlan();
    const categoryId = firstCategoryId(plan);
    const otherTotal = plan.budget.categories
      .filter((c) => c.id !== categoryId)
      .reduce((sum, c) => sum + c.plannedInr, 0);
    const targetAmount = plan.budget.totalInr + 10_000;
    const expected = Math.min(MAX_BUDGET_INR - otherTotal, targetAmount);

    const updated = setBudgetPlanned(plan, categoryId, targetAmount);
    expect(updated.budget.categories.find((c) => c.id === categoryId)?.plannedInr).toBe(
      expected,
    );
    expect(updated.brief.budgetInr).toBe(updated.budget.totalInr);
  });

  it("setBudgetPlanned clamps to the remaining budget under the cap", () => {
    const plan = makePlan();
    const categoryId = firstCategoryId(plan);

    const updated = setBudgetPlanned(plan, categoryId, MAX_BUDGET_INR);
    const othersTotal = plan.budget.categories
      .filter((c) => c.id !== categoryId)
      .reduce((sum, c) => sum + c.plannedInr, 0);

    const expected = Math.min(MAX_BUDGET_INR - othersTotal, MAX_BUDGET_INR);
    expect(updated.budget.categories.find((c) => c.id === categoryId)?.plannedInr).toBe(
      expected,
    );
  });

  it("setBudgetPlanned clamps negative amounts to 0", () => {
    const plan = makePlan();
    const categoryId = firstCategoryId(plan);
    const updated = setBudgetPlanned(plan, categoryId, -500);
    expect(updated.budget.categories.find((c) => c.id === categoryId)?.plannedInr).toBe(
      0,
    );
  });

  it("setBudgetActual sets and clears actual values", () => {
    const plan = makePlan();
    const categoryId = firstCategoryId(plan);

    const withActual = setBudgetActual(plan, categoryId, 12_000);
    expect(withActual.budget.categories.find((c) => c.id === categoryId)?.actualInr).toBe(
      12_000,
    );

    const cleared = setBudgetActual(withActual, categoryId, null);
    expect(
      cleared.budget.categories.find((c) => c.id === categoryId)?.actualInr,
    ).toBeNull();
  });

  it("toggleTimelineTask flips the done flag", () => {
    const plan = makePlan();
    const taskId = plan.timeline.tasks[0].id;
    const initial = plan.timeline.tasks[0].done;

    const toggled = toggleTimelineTask(plan, taskId);
    expect(toggled.timeline.tasks.find((t) => t.id === taskId)?.done).toBe(!initial);

    const toggledBack = toggleTimelineTask(toggled, taskId);
    expect(toggledBack.timeline.tasks.find((t) => t.id === taskId)?.done).toBe(initial);
  });

  it("setVendorStatus updates the vendor status", () => {
    const plan = makePlan();
    const vendorId = plan.vendors[0].id;
    const updated = setVendorStatus(plan, vendorId, "booked");
    expect(updated.vendors.find((v) => v.id === vendorId)?.status).toBe("booked");
    expect(plan.vendors.find((v) => v.id === vendorId)?.status).not.toBe("booked");
  });

  it("setVendorQuote sets and clears quotes", () => {
    const plan = makePlan();
    const vendorId = plan.vendors[0].id;

    const withQuote = setVendorQuote(plan, vendorId, 85_000);
    expect(withQuote.vendors.find((v) => v.id === vendorId)?.quoteInr).toBe(85_000);

    const cleared = setVendorQuote(withQuote, vendorId, null);
    expect(cleared.vendors.find((v) => v.id === vendorId)?.quoteInr).toBeNull();
  });

  it("getPlanTotals computes all aggregate values", () => {
    const plan = makePlan();
    const totals = getPlanTotals(plan);

    expect(totals.plannedInr).toBe(plan.budget.totalInr);
    expect(totals.tasksTotal).toBe(plan.timeline.tasks.length);
    expect(totals.vendorsTotal).toBe(plan.vendors.length);
    expect(totals.actualInr).toBe(0);
    expect(totals.quotedInr).toBe(0);
  });

  it("getPlanTotals counts actuals, done tasks, and contacted vendors", () => {
    let plan = makePlan();
    const categoryId = firstCategoryId(plan);
    const taskId = plan.timeline.tasks[0].id;
    const vendorId = plan.vendors[0].id;

    plan = setBudgetActual(plan, categoryId, 20_000);
    plan = toggleTimelineTask(plan, taskId);
    plan = setVendorStatus(plan, vendorId, "contacted");
    plan = setVendorQuote(plan, vendorId, 50_000);

    const totals = getPlanTotals(plan);
    expect(totals.actualInr).toBe(20_000);
    expect(totals.actualRecordedCount).toBe(1);
    expect(totals.tasksDone).toBe(1);
    expect(totals.vendorsContacted).toBe(1);
    expect(totals.quotedInr).toBe(50_000);
  });
});
