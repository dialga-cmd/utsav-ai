/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PlanningWorkspace } from "@/components/PlanningWorkspace";

describe("PlanningWorkspace", () => {
  it("renders without crashing", () => {
    const { container } = render(<PlanningWorkspace />);
    expect(container.querySelector("#plan-workspace")).toBeTruthy();
  });
});
