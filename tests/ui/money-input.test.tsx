/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MoneyInput } from "@/components/ui/MoneyInput";

describe("MoneyInput", () => {
  afterEach(() => cleanup());

  it("commits a rounded whole-rupee value on blur", () => {
    let committed: number | null = null;
    render(
      <MoneyInput
        id="m"
        label="Amount"
        value={100}
        onChange={(v) => {
          committed = v;
        }}
      />,
    );
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "250.7" } });
    fireEvent.blur(input);
    expect(committed).toBe(251);
  });

  it("clamps to the max prop when the typed value exceeds it", () => {
    let committed: number | null = null;
    render(
      <MoneyInput
        id="m"
        label="Amount"
        value={0}
        max={1000}
        onChange={(v) => {
          committed = v;
        }}
      />,
    );
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5000" } });
    fireEvent.blur(input);
    expect(committed).toBe(1000);
  });

  it("resets to the last committed value when the input is not a number", () => {
    render(<MoneyInput id="m" label="Amount" value={999} onChange={() => {}} />);
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    // commit() restores the draft to the last committed prop value
    expect(screen.getByText(/₹999/)).toBeInTheDocument();
  });

  it("returns 0 when cleared on a non-nullable field", () => {
    let committed: number | null = null;
    render(
      <MoneyInput
        id="m"
        label="Planned"
        value={500}
        onChange={(v) => {
          committed = v;
        }}
      />,
    );
    const input = screen.getByLabelText("Planned") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(committed).toBe(0);
  });

  it("returns null when cleared on a nullable field", () => {
    let committed: number | null = 42;
    render(
      <MoneyInput
        id="m"
        label="Actual"
        value={null}
        nullable
        onChange={(v) => {
          committed = v;
        }}
      />,
    );
    const input = screen.getByLabelText("Actual") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(committed).toBeNull();
  });

  it("commits on the Enter key and blurs the field", () => {
    let committed: number | null = null;
    render(
      <MoneyInput
        id="m"
        label="Amount"
        value={0}
        onChange={(v) => {
          committed = v;
        }}
      />,
    );
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(committed).toBe(42);
    expect(document.activeElement).not.toBe(input);
  });

  it("renders the print-only value span with the formatted amount", () => {
    render(<MoneyInput id="m" label="Amount" value={450000} onChange={() => {}} />);
    expect(screen.getByText(/₹4,50,000/)).toBeInTheDocument();
  });

  it("renders the print-only value as 'Not recorded' when null and nullable", () => {
    render(
      <MoneyInput id="m" label="Actual" value={null} nullable onChange={() => {}} />,
    );
    expect(screen.getByText(/Not recorded/)).toBeInTheDocument();
  });
});
