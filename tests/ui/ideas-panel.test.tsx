/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { testPlan } from "./utils";
import { IdeasPanel, type IdeasStatus } from "@/components/plan/IdeasPanel";

function renderIdeas(
  overrides: Partial<{
    status: IdeasStatus;
    error: string | null;
    activeRefinement: Parameters<typeof IdeasPanel>[0]["activeRefinement"];
    onRefine: (refinement: Parameters<typeof IdeasPanel>[0]["activeRefinement"]) => void;
    onRetry: () => void;
    noIdeas: boolean;
  }> = {},
) {
  const plan = testPlan(overrides.noIdeas ? { ideas: null } : undefined);
  const status = overrides.status ?? "idle";
  const error = overrides.error ?? null;
  const activeRefinement = overrides.activeRefinement ?? null;
  let lastRefinement: Parameters<typeof IdeasPanel>[0]["activeRefinement"] | null = null;

  const utils = render(
    <IdeasPanel
      plan={plan}
      status={status}
      error={error}
      activeRefinement={activeRefinement}
      onRefine={(refinement) => {
        lastRefinement = refinement;
        overrides.onRefine?.(refinement);
      }}
      onRetry={() => overrides.onRetry?.()}
    />,
  );

  return { ...utils, plan, getRefinement: () => lastRefinement };
}

describe("IdeasPanel", () => {
  afterEach(() => cleanup());

  it("renders the four refinement chips", () => {
    renderIdeas();
    const chips = screen.getAllByRole("button", {
      name: /Make it cheaper|More traditional|More modern|Kid-friendly/,
    });
    expect(chips).toHaveLength(4);
  });

  it("shows the loading state with a spinner message", () => {
    renderIdeas({ status: "loading" });
    expect(screen.getByText(/Refining your ideas/i)).toBeInTheDocument();
  });

  it("shows the error state with a retry button", () => {
    renderIdeas({ status: "error", error: "Service unavailable." });
    expect(screen.getByText(/Ideas could not be refreshed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows a visible fallback notice when ideas source is 'fallback'", () => {
    renderIdeas();
    expect(
      screen.getByText(/Curated ideas, not a live AI response/i),
    ).toBeInTheDocument();
  });

  it("shows the source badge for AI-personalised ideas", () => {
    const plan = testPlan();
    const aiPlan = {
      ...plan,
      ideas: plan.ideas ? { ...plan.ideas, source: "ai" as const } : plan.ideas,
    };
    render(
      <IdeasPanel
        plan={aiPlan}
        status="idle"
        error={null}
        activeRefinement={null}
        onRefine={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("Personalised by Gemini")).toBeInTheDocument();
  });

  it("shows the empty state when no ideas and not loading", () => {
    renderIdeas({ noIdeas: true, status: "idle" });
    expect(screen.getByText(/Ideas will appear here/i)).toBeInTheDocument();
  });

  it("shows 'Show original' button when a refinement is active", () => {
    renderIdeas({ activeRefinement: "cheaper" });
    expect(screen.getByRole("button", { name: "Show original" })).toBeInTheDocument();
  });

  it("marks the active refinement chip with aria-pressed", () => {
    renderIdeas({ activeRefinement: "more_traditional" });
    const chip = screen.getByRole("button", { name: /More traditional/i });
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onRefine when a chip is clicked", () => {
    const { getRefinement } = renderIdeas();
    fireEvent.click(screen.getByRole("button", { name: /Make it cheaper/i }));
    expect(getRefinement()).toBe("cheaper");
  });

  it("calls onRefine with null when 'Show original' is clicked", () => {
    const { getRefinement } = renderIdeas({ activeRefinement: "cheaper" });
    fireEvent.click(screen.getByRole("button", { name: "Show original" }));
    expect(getRefinement()).toBeNull();
  });

  it("renders the idea cards for menu, activities, decor and gifts", () => {
    renderIdeas();
    expect(screen.getByRole("heading", { name: "Food & menu" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Activities & flow" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decor & styling" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Gifts & keepsakes" }),
    ).toBeInTheDocument();
  });

  it("renders the savings section heading", () => {
    renderIdeas();
    expect(
      screen.getByRole("heading", { name: /Where to save without losing the feel/ }),
    ).toBeInTheDocument();
  });

  it("disables refinement chips while loading", () => {
    renderIdeas({ status: "loading" });
    const chip = screen.getByRole("button", { name: /Cheaper/i });
    expect(chip).toBeDisabled();
  });

  it("renders the theme text", () => {
    const plan = testPlan();
    const theme = plan.ideas!.theme;
    render(
      <IdeasPanel
        plan={plan}
        status="idle"
        error={null}
        activeRefinement={null}
        onRefine={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(theme)).toBeInTheDocument();
  });
});
