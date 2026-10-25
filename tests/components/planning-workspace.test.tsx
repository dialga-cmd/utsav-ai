/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PlanningWorkspace } from "@/components/PlanningWorkspace";
import { makePlan } from "@/tests/plan-factory";
import { saveStoredPlan } from "@/lib/storage";

describe("PlanningWorkspace", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders intake panel when no plan is saved and triggers extraction", () => {
    const { container } = render(<PlanningWorkspace />);
    expect(container.querySelector("#plan-workspace")).toBeTruthy();
    expect(screen.getByRole("button", { name: /try the demo/i })).toBeTruthy();

    const textarea = screen.getByLabelText(/describe your event/i);
    fireEvent.change(textarea, { target: { value: "A birthday party in Mumbai" } });

    const extractBtn = screen.getByRole("button", { name: /read my note/i });
    fireEvent.click(extractBtn);
  });

  it("renders plan view when a plan is restored from storage and supports interactions", () => {
    const plan = makePlan();
    saveStoredPlan(plan);

    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(<PlanningWorkspace />);

    // Should display the plan view
    expect(screen.getByRole("heading", { name: /wedding in jaipur/i })).toBeTruthy();

    // Verify print handler
    const printButton = screen.getByRole("button", { name: /print/i });
    fireEvent.click(printButton);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();

    // Switch to Ideas tab and trigger refinement
    const ideasTab = screen.getByRole("tab", { name: /ideas/i });
    fireEvent.click(ideasTab);
    const refineChip = screen.getByRole("button", { name: /make it cheaper/i });
    fireEvent.click(refineChip);

    // Switch to Vendors tab and trigger draft enquiry
    const vendorsTab = screen.getByRole("tab", { name: /vendors/i });
    fireEvent.click(vendorsTab);
    const draftButtons = screen.getAllByRole("button", { name: /draft enquiry/i });
    if (draftButtons.length > 0) {
      fireEvent.click(draftButtons[0]);
    }

    // Verify reset modal flow: click start new plan -> shows confirmation modal -> cancel
    const startOverBtn = screen.getByRole("button", { name: /start a new plan/i });
    fireEvent.click(startOverBtn);
    expect(screen.getByText(/start a new plan\?/i)).toBeTruthy();

    const cancelResetBtn = screen.getByRole("button", { name: /keep this plan/i });
    fireEvent.click(cancelResetBtn);
    expect(screen.queryByText(/start a new plan\?/i)).toBeNull();

    // Now click start new plan -> confirm reset
    fireEvent.click(startOverBtn);
    const confirmResetBtn = screen.getByRole("button", {
      name: /yes, clear and start over/i,
    });
    act(() => {
      fireEvent.click(confirmResetBtn);
    });

    // Plan should now be cleared back to intake panel
    expect(
      screen.getAllByRole("button", { name: /try the demo/i }).length,
    ).toBeGreaterThan(0);
  });
});
