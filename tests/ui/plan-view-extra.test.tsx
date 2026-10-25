/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { PlanView } from "@/components/plan/PlanView";
import { testPlan } from "./utils";
import { getPlanTotals } from "@/lib/plan";

function renderPlanView(overrides: Partial<Parameters<typeof PlanView>[0]> = {}) {
  const plan = testPlan();
  const totals = getPlanTotals(plan);
  const noop = () => {};
  const props: Parameters<typeof PlanView>[0] = {
    plan,
    totals,
    saveStatus: "idle",
    planNotice: null,
    confirmReset: false,
    ideasStatus: "idle",
    ideasError: null,
    activeRefinement: null,
    vendorMessageStates: {},
    onBudgetPlannedChange: noop,
    onBudgetActualChange: noop,
    onToggleTask: noop,
    onVendorStatusChange: noop,
    onVendorQuoteChange: noop,
    onDraftVendorMessage: noop,
    onRefine: noop,
    onRetryIdeas: noop,
    onStartOver: noop,
    onCancelReset: noop,
    onConfirmReset: noop,
    onPrint: noop,
    ...overrides,
  };
  return { plan, totals, utils: render(<PlanView {...props} />), props };
}

describe("PlanView save-status and reset flows", () => {
  it("shows a failure notice when saveStatus is failed", () => {
    const { utils } = renderPlanView({ saveStatus: "failed" });
    expect(utils.getByRole("alert")).toBeInTheDocument();
  });
  it("shows a plan notice when provided", () => {
    const { utils } = renderPlanView({
      planNotice: {
        tone: "warning",
        title: "This saved plan is in the past",
        body: "The event date has passed.",
      },
    });
    expect(utils.getByText("This saved plan is in the past")).toBeInTheDocument();
  });
  it("confirms reset when confirmReset is true", () => {
    const onConfirmReset = vi.fn();
    const onCancelReset = vi.fn();
    const { utils } = renderPlanView({
      confirmReset: true,
      onConfirmReset,
      onCancelReset,
    });
    const confirmBtn = utils.getAllByRole("button", {
      name: /Yes, clear and start over/i,
    })[0];
    const cancelBtn = utils.getAllByRole("button", { name: /Keep this plan/i })[0];
    fireEvent.click(confirmBtn);
    expect(onConfirmReset).toHaveBeenCalled();
    fireEvent.click(cancelBtn);
    expect(onCancelReset).toHaveBeenCalled();
  }, 10_000);
  it("triggers print and start-over", () => {
    const onPrint = vi.fn();
    const onStartOver = vi.fn();
    const { props } = renderPlanView({ onPrint, onStartOver });
    const { container: second } = render(<PlanView {...props} />);
    // The header buttons: "Print / save PDF" and "Start a new plan"
    const allButtons = second.querySelectorAll("button");
    let printBtn: HTMLButtonElement | undefined;
    let startOverBtn: HTMLButtonElement | undefined;
    allButtons.forEach((b) => {
      const t = b.textContent ?? "";
      if (t.includes("Print")) printBtn = b;
      if (t.trim() === "Start a new plan") startOverBtn = b;
    });
    expect(printBtn).toBeTruthy();
    expect(startOverBtn).toBeTruthy();
    fireEvent.click(printBtn!);
    fireEvent.click(startOverBtn!);
    expect(onPrint.mock.calls.length).toBe(1);
    expect(onStartOver.mock.calls.length).toBe(1);
  });
});
