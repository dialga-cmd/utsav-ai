/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PlanView } from "@/components/plan/PlanView";
import { testPlan } from "./utils";
import { getPlanTotals } from "@/lib/plan";

describe("PlanView render", () => {
  it("renders with totals", () => {
    const plan = testPlan();
    const totals = getPlanTotals(plan);
    const { container } = render(
      <PlanView
        plan={plan}
        totals={totals}
        saveStatus="saved"
        planNotice={null}
        confirmReset={false}
        ideasStatus="idle"
        ideasError={null}
        activeRefinement={null}
        vendorMessageStates={{}}
        onBudgetPlannedChange={() => {}}
        onBudgetActualChange={() => {}}
        onToggleTask={() => {}}
        onVendorStatusChange={() => {}}
        onVendorQuoteChange={() => {}}
        onDraftVendorMessage={() => {}}
        onRefine={() => {}}
        onRetryIdeas={() => {}}
        onStartOver={() => {}}
        onCancelReset={() => {}}
        onConfirmReset={() => {}}
        onPrint={() => {}}
      />,
    );
    expect(container.textContent).toContain("Plan");
  });
});
