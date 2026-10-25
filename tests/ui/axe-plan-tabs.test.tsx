/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { axe } from "vitest-axe";
import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { TimelinePanel } from "@/components/plan/TimelinePanel";
import { VendorsPanel } from "@/components/plan/VendorsPanel";
import { IdeasPanel } from "@/components/plan/IdeasPanel";
import { testPlan } from "./utils";
import { getPlanTotals } from "@/lib/plan";

function assertNoViolations(results: Awaited<ReturnType<typeof axe>>) {
  const details = results.violations
    .filter((v) => v.id !== "region")
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help} @ ${v.nodes
          .map((n) => n.target.join(", "))
          .join("; ")}`,
    )
    .join("\n");
  expect(details).toBe("");
}

function makePanelPanels(): Array<{ label: string; panel: React.ReactElement }> {
  const plan = testPlan();
  const totals = getPlanTotals(plan);
  const noop = () => {};
  return [
    {
      label: "Budget",
      panel: (
        <BudgetPanel
          plan={plan}
          totals={totals}
          onPlannedChange={noop}
          onActualChange={noop}
        />
      ),
    },
    {
      label: "Timeline",
      panel: <TimelinePanel plan={plan} totals={totals} onToggleTask={noop} />,
    },
    {
      label: "Vendors",
      panel: (
        <VendorsPanel
          plan={plan}
          messageStates={{}}
          onStatusChange={noop}
          onQuoteChange={noop}
          onDraftMessage={noop}
        />
      ),
    },
    {
      label: "Ideas",
      panel: (
        <IdeasPanel
          plan={plan}
          status="idle"
          error={null}
          activeRefinement={null}
          onRefine={noop}
          onRetry={noop}
        />
      ),
    },
  ];
}

describe("Plan tab accessibility", () => {
  afterEach(() => cleanup());

  it("has zero axe violations on the Budget panel", async () => {
    const { container } = render(makePanelPanels()[0].panel);
    assertNoViolations(await axe(container));
  }, 15_000);

  it("has zero axe violations on the Timeline panel", async () => {
    const { container } = render(makePanelPanels()[1].panel);
    assertNoViolations(await axe(container));
  }, 15_000);

  it("has zero axe violations on the Vendors panel", async () => {
    const { container } = render(makePanelPanels()[2].panel);
    assertNoViolations(await axe(container));
  }, 15_000);

  it("has zero axe violations on the Ideas panel", async () => {
    const { container } = render(makePanelPanels()[3].panel);
    assertNoViolations(await axe(container));
  }, 15_000);
});
