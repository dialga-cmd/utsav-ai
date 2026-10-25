/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PlanTabs } from "@/components/plan/PlanTabs";

const tabs = [
  { id: "budget", label: "Budget", content: <div>Budget panel content</div> },
  { id: "timeline", label: "Timeline", content: <div>Timeline panel content</div> },
  { id: "vendors", label: "Vendors", content: <div>Vendors panel content</div> },
  { id: "ideas", label: "Ideas", content: <div>Ideas panel content</div> },
];

describe("PlanTabs keyboard navigation", () => {
  afterEach(() => cleanup());

  function renderTabs() {
    render(<PlanTabs tabs={tabs} />);
    return {
      getTab: (label: string) => screen.getByRole("tab", { name: label }) as HTMLElement,
    };
  }

  it("renders all tabs and selects the first by default", () => {
    renderTabs();
    const tablist = screen.getByRole("tablist", { name: "Plan sections" });
    expect(tablist).toBeInTheDocument();

    const allTabs = screen.getAllByRole("tab");
    expect(allTabs).toHaveLength(4);

    // First tab is selected
    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    // Only the selected panel is visible
    expect(document.getElementById("panel-budget")).not.toHaveAttribute("hidden");
    expect(document.getElementById("panel-timeline")).toHaveAttribute("hidden");
  });

  it("activates a tab on click and hides the others", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));

    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(document.getElementById("panel-timeline")).not.toHaveAttribute("hidden");
    expect(document.getElementById("panel-budget")).toHaveAttribute("hidden");
  });

  it("moves to the next tab with ArrowRight", () => {
    renderTabs();
    const budgetTab = screen.getByRole("tab", { name: "Budget" }) as HTMLElement;
    budgetTab.focus();

    fireEvent.keyDown(budgetTab, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveFocus();
  });

  it("wraps from the last tab to the first with ArrowRight", () => {
    renderTabs();
    // Select the last tab (Ideas)
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));

    const ideasTab = screen.getByRole("tab", { name: "Ideas" }) as HTMLElement;
    ideasTab.focus();
    fireEvent.keyDown(ideasTab, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("moves to the previous tab with ArrowLeft", () => {
    renderTabs();
    // Select Vendors (3rd tab)
    fireEvent.click(screen.getByRole("tab", { name: "Vendors" }));

    const vendorsTab = screen.getByRole("tab", { name: "Vendors" }) as HTMLElement;
    vendorsTab.focus();
    fireEvent.keyDown(vendorsTab, { key: "ArrowLeft" });

    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("wraps from the first tab to the last with ArrowLeft", () => {
    renderTabs();
    const budgetTab = screen.getByRole("tab", { name: "Budget" }) as HTMLElement;
    budgetTab.focus();
    fireEvent.keyDown(budgetTab, { key: "ArrowLeft" });

    expect(screen.getByRole("tab", { name: "Ideas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("jumps to the first tab with Home", () => {
    renderTabs();
    // Navigate to a middle tab first
    fireEvent.click(screen.getByRole("tab", { name: "Vendors" }));

    const vendorsTab = screen.getByRole("tab", { name: "Vendors" }) as HTMLElement;
    vendorsTab.focus();
    fireEvent.keyDown(vendorsTab, { key: "Home" });

    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("jumps to the last tab with End", () => {
    renderTabs();
    const budgetTab = screen.getByRole("tab", { name: "Budget" }) as HTMLElement;
    budgetTab.focus();
    fireEvent.keyDown(budgetTab, { key: "End" });

    expect(screen.getByRole("tab", { name: "Ideas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("only the selected tab has tabIndex 0", () => {
    renderTabs();
    const selected = screen.getByRole("tab", { name: "Budget" });
    const unselected = screen.getByRole("tab", { name: "Timeline" });

    expect(selected).toHaveAttribute("tabindex", "0");
    expect(unselected).toHaveAttribute("tabindex", "-1");
  });

  it("announces the selected tab in the live region", () => {
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Vendors" }));

    const liveRegion = screen.getByText("Vendors tab selected");
    expect(liveRegion).toBeInTheDocument();
  });
});
