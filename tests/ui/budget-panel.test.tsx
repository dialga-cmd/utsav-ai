/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { testPlan } from "./utils";
import { getPlanTotals } from "@/lib/plan";

describe("BudgetPanel", () => {
  afterEach(() => cleanup());

  function renderBudget(overrides: Parameters<typeof testPlan>[0] = {}) {
    const plan = testPlan(overrides);
    const totals = getPlanTotals(plan);
    let plannedChange: [string, number] | null = null;
    let actualChange: [string, number | null] | null = null;

    render(
      <BudgetPanel
        plan={plan}
        totals={totals}
        onPlannedChange={(id, amount) => {
          plannedChange = [id, amount];
        }}
        onActualChange={(id, amount) => {
          actualChange = [id, amount];
        }}
      />,
    );

    return {
      plan,
      totals,
      plannedChange: () => plannedChange,
      actualChange: () => actualChange,
    };
  }

  it("renders the tier badge and summary stats", () => {
    renderBudget();
    expect(screen.getByText("Planned total")).toBeInTheDocument();
    expect(screen.getByText("Actual recorded")).toBeInTheDocument();
    expect(screen.getByText(/per guest/i)).toBeInTheDocument();
  });

  it("renders every budget category with its guidance and planned/actual inputs", () => {
    const { plan } = renderBudget();
    for (const category of plan.budget.categories) {
      expect(screen.getByRole("heading", { name: category.label })).toBeInTheDocument();
      expect(screen.getByText(category.guidance)).toBeInTheDocument();
    }
    expect(screen.getAllByLabelText("Planned (₹)")).toHaveLength(
      plan.budget.categories.length,
    );
    expect(screen.getAllByLabelText("Actual paid (₹)")).toHaveLength(
      plan.budget.categories.length,
    );
  });

  it("calls onPlannedChange when a planned MoneyInput commits", () => {
    const { plan, plannedChange } = renderBudget();
    const categoryId = plan.budget.categories[0].id;
    const inputs = screen.getAllByLabelText("Planned (₹)") as HTMLInputElement[];
    const input = inputs[0];
    const original = plan.budget.categories[0].plannedInr;

    fireEvent.change(input, { target: { value: String(original + 1000) } });
    fireEvent.blur(input);

    expect(plannedChange()).toEqual([categoryId, original + 1000]);
  });

  it("calls onActualChange when an actual MoneyInput commits and clears", () => {
    const { plan, actualChange } = renderBudget();
    const categoryId = plan.budget.categories[0].id;
    const input = (screen.getAllByLabelText("Actual paid (₹)") as HTMLInputElement[])[0];

    fireEvent.change(input, { target: { value: "12000" } });
    fireEvent.blur(input);
    expect(actualChange()).toEqual([categoryId, 12000]);

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(actualChange()).toEqual([categoryId, null]);
  });

  it("shows the over-plan badge when actual exceeds planned", () => {
    const plan = testPlan();
    const overPlan = {
      ...plan,
      budget: {
        ...plan.budget,
        categories: plan.budget.categories.map((c, i) =>
          i === 0 ? { ...c, actualInr: c.plannedInr + 1000 } : c,
        ),
      },
    };
    const totals = getPlanTotals(overPlan);

    render(
      <BudgetPanel
        plan={overPlan}
        totals={totals}
        onPlannedChange={() => {}}
        onActualChange={() => {}}
      />,
    );

    expect(screen.getByText(/Actual is over plan/i)).toBeInTheDocument();
  });

  it("shows actual totals and recorded-line count in the summary strip", () => {
    const plan = testPlan();
    const withActual = {
      ...plan,
      budget: {
        ...plan.budget,
        categories: plan.budget.categories.map((c, i) =>
          i === 0 ? { ...c, actualInr: 25_000 } : c,
        ),
      },
    };
    const totals = getPlanTotals(withActual);

    render(
      <BudgetPanel
        plan={withActual}
        totals={totals}
        onPlannedChange={() => {}}
        onActualChange={() => {}}
      />,
    );

    expect(screen.getByText("₹25,000")).toBeInTheDocument();
    expect(
      screen.getByText(`${totals.actualRecordedCount}/${plan.budget.categories.length}`),
    ).toBeInTheDocument();
  });
});
