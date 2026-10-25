/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Notice } from "@/components/ui/Notice";
import type { NoticeTone } from "@/components/ui/Notice";
import { BrandMark } from "@/components/ui/BrandMark";

function renderNotice(tone: NoticeTone) {
  return render(
    <Notice tone={tone} title="Heading text">
      Body copy here
    </Notice>,
  );
}

describe("Notice", () => {
  afterEach(() => cleanup());

  it.each(["info", "warning", "success", "danger"])(
    "renders the %s tone with title and body",
    (tone) => {
      renderNotice(tone as NoticeTone);
      expect(screen.getByText("Heading text")).toBeInTheDocument();
      expect(screen.getByText("Body copy here")).toBeInTheDocument();
      const notice = screen.getByText("Heading text").closest(".notice")!;
      expect(notice).toHaveClass(`notice-${tone}`);
    },
  );

  it("defaults to the info tone when no tone is given", () => {
    render(<Notice title="Default">Body</Notice>);
    expect(screen.getByText("Default").closest(".notice")).toHaveClass("notice-info");
  });

  it("does not render a title element when title is omitted", () => {
    render(<Notice>Only body</Notice>);
    expect(screen.queryByRole("strong")).toBeNull();
  });

  it("sets role=status when live is true so the content is announced", () => {
    render(
      <Notice live title="Live">
        Announced body
      </Notice>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Announced body");
  });

  it("omits the live role when live is false", () => {
    render(<Notice title="Static">Body</Notice>);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("merges the custom className with the tone class", () => {
    render(
      <Notice className="mt-4" title="Spaced">
        Body
      </Notice>,
    );
    expect(screen.getByText("Spaced").closest(".notice")).toHaveClass("mt-4");
  });

  it("renders an element with a custom id", () => {
    render(
      <Notice id="custom-notice" title="Id">
        Body
      </Notice>,
    );
    expect(screen.getByText("Id").closest("#custom-notice")).toBeInTheDocument();
  });
});

describe("BrandMark", () => {
  afterEach(() => cleanup());

  it("renders an aria-hidden decorative svg", () => {
    render(<BrandMark />);
    const svg = document.querySelector("svg.brand-mark");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
    expect(svg!.getAttribute("focusable")).toBe("false");
  });
});
