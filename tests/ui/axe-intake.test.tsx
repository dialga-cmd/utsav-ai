/**
 * @vitest-environment jsdom
 */
import { describe, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { axe } from "vitest-axe";
import { IntakePanel } from "@/components/intake/IntakePanel";
import { createEmptyIntake } from "@/lib/intake";

function makeProps() {
  return {
    values: createEmptyIntake(),
    errors: {},
    freeText: "",
    freeTextError: null,
    followUps: [],
    restoreNotice: null,
    isExtracting: false,
    statusMessage: "",
    onFreeTextChange: () => {},
    onExample: () => {},
    onDemo: () => {},
    onExtract: () => {},
    onFieldChange: () => {},
    onSubmit: () => {},
  };
}

// Assert zero violations, printing the failures on mismatch.
function assertNoViolations(results: Awaited<ReturnType<typeof axe>>) {
  const violations = results.violations;
  if (violations.length > 0) {
    const details = violations
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.help} @ ${v.nodes
            .map((n) => n.target.join(", "))
            .join("; ")}`,
      )
      .join("\n");
    throw new Error(`Axe violations found:\n${details}`);
  }
}

describe("Landing page accessibility (IntakePanel)", () => {
  afterEach(() => cleanup());

  it("has zero axe violations on the blank intake view", async () => {
    const { container } = render(<IntakePanel {...makeProps()} />);
    assertNoViolations(await axe(container));
  });

  it("has zero axe violations when validation errors are shown", async () => {
    const { container } = render(
      <IntakePanel
        {...makeProps()}
        errors={{
          guests: "Add at least one guest.",
          budgetInr: "Add a budget of at least ₹1.",
        }}
      />,
    );
    assertNoViolations(await axe(container));
  });

  it("has zero axe violations when a follow-up notice is shown", async () => {
    const { container } = render(
      <IntakePanel
        {...makeProps()}
        followUps={[{ field: "eventDate", question: "What date is the event?" }]}
      />,
    );
    assertNoViolations(await axe(container));
  });

  it("has zero axe violations when a restore notice is shown", async () => {
    const { container } = render(
      <IntakePanel {...makeProps()} restoreNotice="The saved plan could not be read." />,
    );
    assertNoViolations(await axe(container));
  });
});
