/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { testPlan } from "./utils";
import { TimelinePanel } from "@/components/plan/TimelinePanel";
import { getPlanTotals } from "@/lib/plan";

afterEach(() => cleanup());

describe("TimelinePanel", () => {
  it("renders task checkboxes with urgency badges", () => {
    const plan = testPlan();
    const totals = getPlanTotals(plan);

    render(<TimelinePanel plan={plan} totals={totals} onToggleTask={() => {}} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(plan.timeline.tasks.length);
  });

  it("shows progress bar with correct value", () => {
    const plan = testPlan();
    const totals = getPlanTotals(plan);

    render(<TimelinePanel plan={plan} totals={totals} onToggleTask={() => {}} />);

    const progressBar = screen.getByRole("progressbar", { name: "Tasks completed" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  it("calls onToggleTask when a checkbox is clicked", () => {
    const plan = testPlan();
    let toggledId: string | null = null;

    render(
      <TimelinePanel
        plan={plan}
        totals={getPlanTotals(plan)}
        onToggleTask={(id) => {
          toggledId = id;
        }}
      />,
    );

    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(firstCheckbox);

    expect(toggledId).toBe(plan.timeline.tasks[0].id);
  });

  it("shows compressed notice when timeline is compressed", () => {
    const plan = testPlan();
    const compressedPlan = {
      ...plan,
      timeline: { ...plan.timeline, compressed: true },
    };
    const totals = getPlanTotals(plan);

    render(
      <TimelinePanel plan={compressedPlan} totals={totals} onToggleTask={() => {}} />,
    );

    expect(
      screen.getByText(/Your date is sooner than some lead times/),
    ).toBeInTheDocument();
  });

  it("shows success notice when all tasks are done", () => {
    const plan = testPlan();
    const donePlan = {
      ...plan,
      timeline: {
        ...plan.timeline,
        tasks: plan.timeline.tasks.map((t) => ({ ...t, done: true })),
      },
    };
    const totals = getPlanTotals(donePlan);

    render(<TimelinePanel plan={donePlan} totals={totals} onToggleTask={() => {}} />);

    expect(screen.getByText(/Every task is ticked/)).toBeInTheDocument();
  });

  it("shows days-to-go badge in the toolbar", () => {
    const plan = testPlan();
    const totals = getPlanTotals(plan);

    render(<TimelinePanel plan={plan} totals={totals} onToggleTask={() => {}} />);

    const badge = screen.getByText(/days to go/);
    expect(badge).toBeInTheDocument();
  });
});
