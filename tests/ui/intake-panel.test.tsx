/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { IntakeErrors, IntakeFormValues } from "@/lib/intake";
import { createEmptyIntake } from "@/lib/intake";
import type { FollowUp } from "@/types/ai";
import { IntakePanel } from "@/components/intake/IntakePanel";

function renderIntake(
  overrides: Partial<{
    values: IntakeFormValues;
    errors: IntakeErrors;
    freeText: string;
    freeTextError: string | null;
    followUps: FollowUp[];
    restoreNotice: string | null;
    isExtracting: boolean;
    statusMessage: string;
  }> = {},
) {
  const values = overrides.values ?? createEmptyIntake();
  const errors = overrides.errors ?? {};
  const freeText = overrides.freeText ?? "";
  const freeTextError = overrides.freeTextError ?? null;
  const followUps = overrides.followUps ?? [];
  const restoreNotice = overrides.restoreNotice ?? null;
  const isExtracting = overrides.isExtracting ?? false;
  const statusMessage = overrides.statusMessage ?? "";

  let lastSubmitted: IntakeFormValues | null = null;

  const utils = render(
    <IntakePanel
      values={values}
      errors={errors}
      freeText={freeText}
      freeTextError={freeTextError}
      followUps={followUps}
      restoreNotice={restoreNotice}
      isExtracting={isExtracting}
      statusMessage={statusMessage}
      onFreeTextChange={() => {}}
      onExample={() => {}}
      onDemo={() => {}}
      onExtract={() => {}}
      onFieldChange={() => {}}
      onSubmit={() => {
        lastSubmitted = values;
      }}
    />,
  );

  return { ...utils, getSubmitted: () => lastSubmitted };
}

describe("IntakePanel", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders the hero and both intake cards", () => {
    renderIntake();
    expect(
      screen.getByRole("heading", {
        name: "Plan the celebration. Keep the budget in sight.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tell us about the celebration" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Set the details yourself" }),
    ).toBeInTheDocument();
  });

  it("shows the restore notice when provided", () => {
    renderIntake({ restoreNotice: "The saved plan could not be read." });
    expect(screen.getByText("The saved plan could not be read.")).toBeInTheDocument();
  });

  it("shows the free-text area and example chips", () => {
    renderIntake();
    expect(screen.getByLabelText("Describe your event")).toBeInTheDocument();
    expect(screen.getByText("Try an example")).toBeInTheDocument();
  });

  it("shows the status message in the live region", () => {
    renderIntake({ statusMessage: "Reading your note…" });
    expect(screen.getByText("Reading your note…")).toBeInTheDocument();
  });

  it("shows validation errors on the corresponding fields", () => {
    renderIntake({
      errors: {
        guests: "Add at least one guest.",
        budgetInr: "Add a budget of at least ₹1.",
      },
    });
    expect(screen.getByText("Add at least one guest.")).toBeInTheDocument();
    expect(screen.getByText("Add a budget of at least ₹1.")).toBeInTheDocument();
    expect(screen.getByLabelText("Guests")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows follow-up questions when provided", () => {
    renderIntake({
      followUps: [{ field: "eventDate", question: "What date is the event?" }],
    });
    expect(screen.getByText("A couple of details to confirm")).toBeInTheDocument();
    expect(screen.getByText("What date is the event?")).toBeInTheDocument();
  });

  it("disables the extract button while extracting", () => {
    renderIntake({ isExtracting: true });
    const button = screen.getByRole("button", { name: /Reading your note/i });
    expect(button).toBeDisabled();
  });

  it("calls onSubmit when the form is submitted", () => {
    const { getSubmitted } = renderIntake({
      values: {
        ...createEmptyIntake(),
        eventDate: "2026-12-15",
        guests: "120",
        budgetInr: "450000",
        city: "Jaipur",
      },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Build from these details" }));
    expect(getSubmitted()).not.toBeNull();
  });

  it("shows free-text error when provided", () => {
    renderIntake({ freeTextError: "Add more detail." });
    expect(screen.getByText("Add more detail.")).toBeInTheDocument();
  });

  it("renders How it works as an ordered list with four step items", () => {
    renderIntake();
    const orderedList = document.querySelector("#how-it-works ol");
    expect(orderedList).not.toBeNull();
    expect(orderedList!.tagName).toBe("OL");
    const stepItems = orderedList!.querySelectorAll("li");
    expect(stepItems.length).toBe(4);
    expect(screen.getByText("Read.")).toBeInTheDocument();
    expect(screen.getByText("Build.")).toBeInTheDocument();
    expect(screen.getByText("Personalise.")).toBeInTheDocument();
    expect(screen.getByText("Keep.")).toBeInTheDocument();
  });
});
