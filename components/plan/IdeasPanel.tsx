"use client";

import { IDEA_REFINEMENTS } from "@/types/ai";
import type { IdeaRefinement } from "@/types/ai";
import { REFINEMENT_LABELS } from "@/lib/constants";
import type { PlanSnapshot } from "@/types/plan";

export type IdeasStatus = "idle" | "loading" | "error";

interface IdeasPanelProps {
  plan: PlanSnapshot;
  status: IdeasStatus;
  error: string | null;
  activeRefinement: IdeaRefinement | null;
  onRefine: (refinement: IdeaRefinement | null) => void;
  onRetry: () => void;
}

const IDEA_GROUPS = [
  { key: "menu", title: "Food & menu" },
  { key: "activities", title: "Activities & flow" },
  { key: "decor", title: "Decor & styling" },
  { key: "gifts", title: "Gifts & keepsakes" },
] as const;

export function IdeasPanel({
  plan,
  status,
  error,
  activeRefinement,
  onRefine,
  onRetry,
}: IdeasPanelProps) {
  const ideas = plan.ideas;
  const isLoading = status === "loading";

  return (
    <div aria-busy={isLoading}>
      <div className="panel-toolbar">
        <div>
          <h2 id="ideas-heading" className="panel-heading">
            Ideas
          </h2>
          <p className="panel-copy">
            A starting point grounded in your city, budget, guests and notes. Refine it in
            one tap, then bring it back to what your family will actually enjoy.
          </p>
        </div>
        {ideas ? (
          <span
            className={`badge ${ideas.source === "ai" ? "badge-good" : "badge-neutral"}`}
          >
            {ideas.source === "ai" ? "Personalised by Gemini" : "Curated offline"}
          </span>
        ) : null}
      </div>

      <div className="no-print" role="group" aria-labelledby="refine-label">
        <p id="refine-label" className="field-label">
          Refine these ideas
        </p>
        <div className="refine-row">
          {IDEA_REFINEMENTS.map((refinement) => (
            <button
              key={refinement}
              type="button"
              className="chip"
              aria-pressed={activeRefinement === refinement}
              disabled={isLoading}
              onClick={() => onRefine(refinement)}
            >
              {REFINEMENT_LABELS[refinement]}
            </button>
          ))}
          {activeRefinement ? (
            <button
              type="button"
              className="btn btn-quiet btn-small"
              onClick={() => onRefine(null)}
              disabled={isLoading}
            >
              Show original
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="idea-loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          {ideas ? "Refining your ideas…" : "Building personalised ideas…"}
        </p>
      ) : null}

      {error ? (
        <div className="notice notice-danger mt-3" role="alert">
          <strong>Ideas could not be refreshed.</strong>
          {error}
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {!ideas && !isLoading && !error ? (
        <div className="empty-note mt-3">
          Ideas will appear here once your plan is ready.
        </div>
      ) : null}

      {!ideas && !isLoading && error ? (
        <div className="empty-note mt-3">
          Your budget, timeline and vendor checklist are unaffected. You can retry the
          ideas without rebuilding the plan.
        </div>
      ) : null}

      {ideas ? (
        <div className={isLoading ? "opacity-70" : undefined}>
          {ideas.source === "fallback" ? (
            <p className="notice notice-info mt-3">
              <strong>Curated ideas, not a live AI response.</strong>
              The model was unavailable, so these recommendations were built from your
              brief using the same budget logic. The rest of the plan is unaffected.
            </p>
          ) : null}

          <div className="idea-theme mt-3">{ideas.theme}</div>

          <div className="idea-grid">
            {IDEA_GROUPS.map((group) => (
              <article key={group.key} className="idea-card">
                <h3>{group.title}</h3>
                <ul>
                  {ideas[group.key].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <section className="savings" aria-labelledby="savings-heading">
            <h3 id="savings-heading">Where to save without losing the feel</h3>
            <ul>
              {ideas.savings.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
