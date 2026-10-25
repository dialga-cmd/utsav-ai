/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { VendorsPanel } from "@/components/plan/VendorsPanel";
import { testPlan } from "./utils";

describe("VendorsPanel interactions", () => {
  it("changes status, quote, and drafts a message", () => {
    const plan = testPlan();
    const onStatusChange = vi.fn();
    const onQuoteChange = vi.fn();
    const onDraftMessage = vi.fn();
    const vendor = plan.vendors[0];
    const { container } = render(
      <VendorsPanel
        plan={plan}
        messageStates={{}}
        onStatusChange={onStatusChange}
        onQuoteChange={onQuoteChange}
        onDraftMessage={onDraftMessage}
      />,
    );
    // Status select
    const statusSelect = container.querySelector(
      `select#vendor-status-${vendor.id}`,
    ) as HTMLSelectElement;
    expect(statusSelect).toBeTruthy();
    fireEvent.change(statusSelect, { target: { value: "booked" } });
    expect(onStatusChange).toHaveBeenCalledWith(vendor.id, "booked");
    // Quote input
    const quoteInput = container.querySelector(
      `#vendor-quote-${vendor.id}`,
    ) as HTMLInputElement;
    expect(quoteInput).toBeTruthy();
    fireEvent.change(quoteInput, { target: { value: "1000" } });
    // Draft button
    const draftBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Draft enquiry"),
    )!;
    expect(draftBtn).toBeTruthy();
    fireEvent.click(draftBtn);
    expect(onDraftMessage).toHaveBeenCalled();
  });
  it("shows loading and ready message states", () => {
    const plan = testPlan();
    const vendor = plan.vendors[0];
    const noop = () => {};
    const { container } = render(
      <VendorsPanel
        plan={plan}
        messageStates={{
          [vendor.id]: {
            status: "ready",
            data: {
              subject: "Enquiry for caterer",
              message: "Namaste, we would like a quote for the wedding catering.",
              source: "ai",
            },
          },
        }}
        onStatusChange={noop}
        onQuoteChange={noop}
        onDraftMessage={noop}
      />,
    );
    expect(container.textContent).toContain("Enquiry for caterer");
    expect(container.textContent).toContain("Draft again");
    // Clipboard: mock
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
    const copyBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Copy message"),
    )!;
    expect(copyBtn).toBeTruthy();
    fireEvent.click(copyBtn);
  });
  it("shows error state", () => {
    const plan = testPlan();
    const vendor = plan.vendors[0];
    const noop = () => {};
    const { container } = render(
      <VendorsPanel
        plan={plan}
        messageStates={{
          [vendor.id]: { status: "error", error: "Something went wrong" },
        }}
        onStatusChange={noop}
        onQuoteChange={noop}
        onDraftMessage={noop}
      />,
    );
    expect(container.textContent).toContain("Something went wrong");
  });
});
