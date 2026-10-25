"use client";

import { MoneyInput } from "@/components/ui/MoneyInput";
import { BUDGET_TIER_LABELS } from "@/lib/constants";
import { formatInr } from "@/lib/format";
import { MAX_BUDGET_INR, type PlanTotals } from "@/lib/plan";
import type { PlanSnapshot } from "@/types/plan";

interface BudgetPanelProps {
  plan: PlanSnapshot;
  totals: PlanTotals;
  onPlannedChange: (categoryId: string, amount: number) => void;
  onActualChange: (categoryId: string, amount: number | null) => void;
}

/**
 * Interactive budget management panel: category allocations, planned vs actual inputs,
 * variance calculations, and largest-remainder integrity validation.
 */
export function BudgetPanel({
  plan,
  totals,
  onPlannedChange,
  onActualChange,
}: BudgetPanelProps) {
  const { budget, brief } = plan;

  return (
    <div>
      <div className="panel-toolbar">
        <div>
          <h2 id="budget-heading" className="panel-heading">
            Budget
          </h2>
          <p className="panel-copy">
            Every rupee is allocated. Edit the planned amount when a real quote arrives,
            and record actual spend as you pay.
          </p>
        </div>
        <span className="badge badge-gold">{BUDGET_TIER_LABELS[budget.tier]} plan</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="card card-pad">
          <p className="stat-label">Planned total</p>
          <p className="stat-value">{formatInr(totals.plannedInr)}</p>
        </div>
        <div className="card card-pad">
          <p className="stat-label">Actual recorded</p>
          <p className="stat-value">{formatInr(totals.actualInr)}</p>
        </div>
        <div className="card card-pad">
          <p className="stat-label">Lines with actuals</p>
          <p className="stat-value">
            {totals.actualRecordedCount}/{budget.categories.length}
          </p>
        </div>
      </div>

      <p className="field-hint mt-2">
        {brief.guests > 0
          ? `${formatInr(budget.perGuestInr)} per guest across ${brief.guests} guests.`
          : "Add a guest count in a new plan for a per-guest view."}{" "}
        Planned amounts always add up to the total shown above.
      </p>

      <div className="budget-list mt-4">
        {budget.categories.map((category) => {
          const overPlan =
            category.actualInr !== null && category.actualInr > category.plannedInr;

          return (
            <article key={category.id} className="budget-row">
              <div className="budget-row-top">
                <div>
                  <h3 className="budget-label">{category.label}</h3>
                  <p className="budget-share">
                    {category.sharePct.toFixed(1)}% of planned ·{" "}
                    {formatInr(category.plannedInr)}
                  </p>
                </div>
                {overPlan ? (
                  <span className="badge badge-warn">Actual is over plan</span>
                ) : null}
              </div>

              <div className="budget-bar" aria-hidden="true">
                <span
                  className="budget-bar-fill"
                  style={{ width: `${Math.min(100, category.sharePct)}%` }}
                />
              </div>

              <p id={`budget-guidance-${category.id}`} className="budget-guidance">
                {category.guidance}
              </p>

              <div className="money-grid">
                <MoneyInput
                  id={`budget-planned-${category.id}`}
                  label="Planned (₹)"
                  value={category.plannedInr}
                  max={Math.max(
                    0,
                    MAX_BUDGET_INR - (totals.plannedInr - category.plannedInr),
                  )}
                  describedBy={`budget-guidance-${category.id}`}
                  onChange={(amount) => onPlannedChange(category.id, amount ?? 0)}
                />
                <MoneyInput
                  id={`budget-actual-${category.id}`}
                  label="Actual paid (₹)"
                  value={category.actualInr}
                  nullable
                  describedBy={`budget-guidance-${category.id}`}
                  onChange={(amount) => onActualChange(category.id, amount)}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
