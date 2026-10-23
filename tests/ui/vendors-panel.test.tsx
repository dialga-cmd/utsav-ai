/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { testPlan } from "./utils";
import { VendorsPanel, type VendorMessageMap } from "@/components/plan/VendorsPanel";
import { firstVendorId } from "./vendor-factory";

function renderVendors(
  overrides: Partial<{
    messageStates: VendorMessageMap;
    onStatusChange: (vendorId: string, status: string) => void;
    onQuoteChange: (vendorId: string, quoteInr: number | null) => void;
    onDraftMessage: (vendor: { id: string; name: string }) => void;
  }> = {},
) {
  const plan = testPlan();
  const messageStates = overrides.messageStates ?? {};

  const utils = render(
    <VendorsPanel
      plan={plan}
      messageStates={messageStates}
      onStatusChange={(id, status) => overrides.onStatusChange?.(id, status)}
      onQuoteChange={(id, amount) => overrides.onQuoteChange?.(id, amount)}
      onDraftMessage={(vendor) => overrides.onDraftMessage?.(vendor)}
    />,
  );

  return { ...utils, plan };
}

function makeReadyState(source: "ai" | "fallback" = "fallback") {
  return {
    status: "ready" as const,
    data: {
      subject: "Venue enquiry",
      message:
        "Hello, we are planning a wedding in Jaipur for 120 guests and would love to know your availability and pricing for November.",
      source,
    },
  };
}

describe("VendorsPanel", () => {
  afterEach(() => cleanup());

  it("renders all vendor cards with their checklists", () => {
    const { plan } = renderVendors();

    for (const vendor of plan.vendors) {
      expect(screen.getByRole("heading", { name: vendor.name })).toBeInTheDocument();
    }

    const firstVendor = plan.vendors[0];
    for (const item of firstVendor.checklist) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("renders a status select for each vendor", () => {
    const { plan } = renderVendors();
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBe(plan.vendors.length);
  });

  it("renders a quote input for each vendor", () => {
    const { plan } = renderVendors();
    const quoteInputs = screen.getAllByLabelText(/Quote received/i);
    expect(quoteInputs.length).toBe(plan.vendors.length);
  });

  it("shows a draft enquiry button for each vendor", () => {
    const { plan } = renderVendors();
    const draftButtons = screen.getAllByRole("button", { name: /Draft enquiry/i });
    expect(draftButtons.length).toBe(plan.vendors.length);
  });

  it("calls onStatusChange when the status select is changed", () => {
    let lastStatus: string | null = null;
    renderVendors({
      onStatusChange: (_id, status) => {
        lastStatus = status;
      },
    });

    const statusSelects = screen.getAllByRole("combobox");
    const firstSelect = statusSelects[0] as HTMLSelectElement;
    fireEvent.change(firstSelect, { target: { value: "contacted" } });
    expect(lastStatus).toBe("contacted");
  });

  it("shows a loading message while a vendor draft is being written", () => {
    renderVendors({
      messageStates: { [firstVendorId]: { status: "loading" } },
    });
    expect(screen.getByText(/Writing a short, plain-text enquiry/)).toBeInTheDocument();
  });

  it("shows an error message when a vendor draft fails", () => {
    renderVendors({
      messageStates: {
        [firstVendorId]: { status: "error", error: "Service unavailable" },
      },
    });
    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
  });

  it("shows the draft message when ready", () => {
    renderVendors({
      messageStates: { [firstVendorId]: makeReadyState() },
    });
    expect(screen.getByText("Venue enquiry")).toBeInTheDocument();
    expect(screen.getByText(/Hello, we are planning a wedding/)).toBeInTheDocument();
    expect(screen.getByText("Offline draft")).toBeInTheDocument();
  });

  it("shows a copy button when a draft is ready", () => {
    renderVendors({
      messageStates: { [firstVendorId]: makeReadyState("ai") },
    });
    expect(screen.getByRole("button", { name: "Copy message" })).toBeInTheDocument();
  });

  it("shows the AI draft badge when source is 'ai'", () => {
    renderVendors({
      messageStates: { [firstVendorId]: makeReadyState("ai") },
    });
    expect(screen.getByText("AI draft")).toBeInTheDocument();
  });

  it("shows 'Draft again' label when a draft already exists", () => {
    renderVendors({
      messageStates: { [firstVendorId]: makeReadyState() },
    });
    expect(screen.getByRole("button", { name: "Draft again" })).toBeInTheDocument();
  });
});
