import { buildBudget, getBudgetTier } from "@/lib/engine/budget";
import { buildTimeline } from "@/lib/engine/timeline";
import { buildVendorChecklist } from "@/lib/engine/vendors";
import type { EventBrief } from "@/types/event";
import type { BudgetBreakdown, PlanSnapshot, VendorStatus } from "@/types/plan";

export const MAX_BUDGET_INR = 100_000_000;

const MAX_INR = MAX_BUDGET_INR;

export type PlanBuildResult =
  { ok: true; plan: PlanSnapshot } | { ok: false; error: string };

/** Build every deterministic part of a plan from a validated brief. */
export function createPlanSnapshot(brief: EventBrief, now = new Date()): PlanBuildResult {
  const timeline = buildTimeline(brief, { now });
  if (!timeline.ok) {
    return { ok: false, error: timeline.error };
  }

  return {
    ok: true,
    plan: {
      brief,
      budget: buildBudget(brief),
      timeline: timeline.plan,
      vendors: buildVendorChecklist(brief.eventType),
      ideas: null,
    },
  };
}

function clampInr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_INR, Math.max(0, Math.round(value)));
}

function recalculateBudget(
  plan: PlanSnapshot,
  categories: BudgetBreakdown["categories"],
): BudgetBreakdown {
  const totalInr = categories.reduce((sum, category) => sum + category.plannedInr, 0);
  return {
    totalInr,
    perGuestInr: plan.brief.guests > 0 ? Math.round(totalInr / plan.brief.guests) : 0,
    tier: getBudgetTier(totalInr, plan.brief.guests),
    categories: categories.map((category) => ({
      ...category,
      sharePct:
        totalInr > 0 ? Math.round((category.plannedInr / totalInr) * 1_000) / 10 : 0,
    })),
  };
}

/**
 * Edit one allocation while keeping the budget total exact and under the
 * app-wide cap. The other categories are never silently reprioritised.
 */
export function setBudgetPlanned(
  plan: PlanSnapshot,
  categoryId: string,
  amount: number,
): PlanSnapshot {
  const others = plan.budget.categories
    .filter((category) => category.id !== categoryId)
    .reduce((sum, category) => sum + category.plannedInr, 0);
  const available = Math.max(0, MAX_INR - others);
  const plannedInr = Math.min(available, clampInr(amount));

  const budget = recalculateBudget(
    plan,
    plan.budget.categories.map((category) =>
      category.id === categoryId ? { ...category, plannedInr } : category,
    ),
  );

  return {
    ...plan,
    brief: { ...plan.brief, budgetInr: budget.totalInr },
    budget,
  };
}

export function setBudgetActual(
  plan: PlanSnapshot,
  categoryId: string,
  amount: number | null,
): PlanSnapshot {
  return {
    ...plan,
    budget: {
      ...plan.budget,
      categories: plan.budget.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              actualInr: amount === null ? null : clampInr(amount),
            }
          : category,
      ),
    },
  };
}

export function toggleTimelineTask(plan: PlanSnapshot, taskId: string): PlanSnapshot {
  return {
    ...plan,
    timeline: {
      ...plan.timeline,
      tasks: plan.timeline.tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      ),
    },
  };
}

export function setVendorStatus(
  plan: PlanSnapshot,
  vendorId: string,
  status: VendorStatus,
): PlanSnapshot {
  return {
    ...plan,
    vendors: plan.vendors.map((vendor) =>
      vendor.id === vendorId ? { ...vendor, status } : vendor,
    ),
  };
}

export function setVendorQuote(
  plan: PlanSnapshot,
  vendorId: string,
  quoteInr: number | null,
): PlanSnapshot {
  return {
    ...plan,
    vendors: plan.vendors.map((vendor) =>
      vendor.id === vendorId
        ? {
            ...vendor,
            quoteInr: quoteInr === null ? null : clampInr(quoteInr),
          }
        : vendor,
    ),
  };
}

export interface PlanTotals {
  plannedInr: number;
  actualInr: number;
  actualRecordedCount: number;
  tasksDone: number;
  tasksTotal: number;
  vendorsContacted: number;
  vendorsBooked: number;
  vendorsTotal: number;
  quotedInr: number;
}

export function getPlanTotals(plan: PlanSnapshot): PlanTotals {
  const actuals = plan.budget.categories
    .map((category) => category.actualInr)
    .filter((amount): amount is number => amount !== null);

  return {
    plannedInr: plan.budget.totalInr,
    actualInr: actuals.reduce((sum, amount) => sum + amount, 0),
    actualRecordedCount: actuals.length,
    tasksDone: plan.timeline.tasks.filter((task) => task.done).length,
    tasksTotal: plan.timeline.tasks.length,
    vendorsContacted: plan.vendors.filter((vendor) => vendor.status !== "not_contacted")
      .length,
    vendorsBooked: plan.vendors.filter((vendor) => vendor.status === "booked").length,
    vendorsTotal: plan.vendors.length,
    quotedInr: plan.vendors.reduce((sum, vendor) => sum + (vendor.quoteInr ?? 0), 0),
  };
}
