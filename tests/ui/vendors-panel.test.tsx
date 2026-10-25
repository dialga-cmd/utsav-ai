/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VendorsPanel, type VendorMessageMap } from "@/components/plan/VendorsPanel";
import { testPlan } from "./utils";

function makeVendors() {
  const plan = testPlan();
  return { plan };
}

describe("VendorsPanel", () => {
  afterEach(() => cleanup());

  function renderVendors(
    overrides: Partial<{
      messageStates: VendorMessageMap;
      onStatusChange: (id: string, status: string) => void;
      onQuoteChange: (id: string, quoteInr: number | null) => void;
      onDraftMessage: () => void;
    }> = {},
  ) {
    const { plan } = makeVendors();
    render(
      <VendorsPanel
        plan={plan}
        messageStates={overrides.messageStates ?? {}}
        onStatusChange={overrides.onStatusChange ?? (() => {})}
        onQuoteChange={overrides.onQuoteChange ?? (() => {})}
        onDraftMessage={overrides.onDraftMessage ?? (() => {})}
      />,
    );
    return { plan };
  }

  it("renders all vendor cards with name, category and checklist", () => {
    const { plan } = renderVendors();

    for (const vendor of plan.vendors) {
      expect(screen.getByRole("heading", { name: vendor.name })).toBeInTheDocument();
      expect(screen.getByText(vendor.category)).toBeInTheDocument();
    }
  });

  it("shows the status select and quote input for each vendor", () => {
    const { plan } = renderVendors();
    const statusSelects = screen.getAllByRole("combobox");
    expect(statusSelects.length).toBe(plan.vendors.length);

    const quoteInputs = screen.getAllByLabelText(/Quote received/i);
    expect(quoteInputs.length).toBe(plan.vendors.length);
  });

  it("calls onStatusChange when the status select is updated", () => {
    let lastStatus: string | null = null;
    renderVendors({
      onStatusChange: (_id, status) => {
        lastStatus = status;
      },
    });

    const statusSelects = screen.getAllByRole("combobox");
    const firstSelect = statusSelects[0] as HTMLSelectElement;
    fireEvent.change(firstSelect, { target: { value: "quoted" } });
    expect(lastStatus).toBe("quoted");
  });

  it("calls onQuoteChange when a quote input is committed", () => {
    let lastQuote: number | null = null;
    renderVendors({
      onQuoteChange: (_id, amount) => {
        lastQuote = amount;
      },
    });

    const quoteInputs = screen.getAllByLabelText(/Quote received/i);
    const firstInput = quoteInputs[0] as HTMLInputElement;
    fireEvent.change(firstInput, { target: { value: "50000" } });
    fireEvent.blur(firstInput);
    expect(lastQuote).toBe(50000);
  });

  it("calls onDraftMessage when the draft enquiry button is clicked", () => {
    let draftClicked = false;
    renderVendors({
      onDraftMessage: () => {
        draftClicked = true;
      },
    });

    const draftButton = screen.getAllByRole("button", { name: /Draft enquiry/i })[0];
    fireEvent.click(draftButton);
    expect(draftClicked).toBe(true);
  });

  it("shows the loading state when a draft is in flight", () => {
    const { plan } = makeVendors();
    const vendorId = plan.vendors[0].id;
    const messageStates: VendorMessageMap = { [vendorId]: { status: "loading" } };

    render(
      <VendorsPanel
        plan={plan}
        messageStates={messageStates}
        onStatusChange={() => {}}
        onQuoteChange={() => {}}
        onDraftMessage={() => {}}
      />,
    );

    expect(screen.getByText(/Drafting…/)).toBeInTheDocument();
  });

  it("shows the error state when a draft fails", () => {
    const { plan } = makeVendors();
    const vendorId = plan.vendors[0].id;
    const messageStates: VendorMessageMap = {
      [vendorId]: { status: "error", error: "The service could not be reached." },
    };

    render(
      <VendorsPanel
        plan={plan}
        messageStates={messageStates}
        onStatusChange={() => {}}
        onQuoteChange={() => {}}
        onDraftMessage={() => {}}
      />,
    );

    expect(screen.getByText("The service could not be reached.")).toBeInTheDocument();
  });

  it("shows the ready state with the draft message and source badge", () => {
    const { plan } = makeVendors();
    const vendorId = plan.vendors[0].id;
    const messageStates: VendorMessageMap = {
      [vendorId]: {
        status: "ready",
        data: {
          subject: "Venue enquiry",
          message: "Namaste, we are planning a wedding in Jaipur for 120 guests.",
          source: "ai",
        },
      },
    };

    render(
      <VendorsPanel
        plan={plan}
        messageStates={messageStates}
        onStatusChange={() => {}}
        onQuoteChange={() => {}}
        onDraftMessage={() => {}}
      />,
    );

    expect(screen.getByText("Venue enquiry")).toBeInTheDocument();
    expect(
      screen.getByText("Namaste, we are planning a wedding in Jaipur for 120 guests."),
    ).toBeInTheDocument();
    expect(screen.getByText("AI draft")).toBeInTheDocument();
  });

  it("shows a copy button when a draft is ready", () => {
    const { plan } = makeVendors();
    const vendorId = plan.vendors[0].id;
    const messageStates: VendorMessageMap = {
      [vendorId]: {
        status: "ready",
        data: {
          subject: "Venue enquiry",
          message: "Namaste, we are planning a wedding in Jaipur for 120 guests.",
          source: "fallback",
        },
      },
    };

    render(
      <VendorsPanel
        plan={plan}
        messageStates={messageStates}
        onStatusChange={() => {}}
        onQuoteChange={() => {}}
        onDraftMessage={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Copy message" })).toBeInTheDocument();
  });

  it("shows 'Draft again' label when a draft already exists", () => {
    const { plan } = makeVendors();
    const vendorId = plan.vendors[0].id;
    const messageStates: VendorMessageMap = {
      [vendorId]: {
        status: "ready",
        data: {
          subject: "Venue enquiry",
          message: "Namaste, we are planning a wedding in Jaipur for 120 guests.",
          source: "fallback",
        },
      },
    };

    render(
      <VendorsPanel
        plan={plan}
        messageStates={messageStates}
        onStatusChange={() => {}}
        onQuoteChange={() => {}}
        onDraftMessage={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Draft again" })).toBeInTheDocument();
  });
});
