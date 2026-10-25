"use client";

import { useCallback, useRef, useState } from "react";
import { requestIdeas } from "@/lib/api/client";
import type { IdeaRefinement } from "@/types/ai";
import type { PlanSnapshot } from "@/types/plan";
import type { IdeasStatus } from "@/components/plan/IdeasPanel";

function keyForRefinement(refinement: IdeaRefinement | null): string {
  return refinement ?? "original";
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "The request took too long. Please try again.";
  }
  if (error instanceof Error && error.message && error.name !== "TypeError") {
    return error.message;
  }
  return "The service could not be reached. Check your connection and try again.";
}

type IdeasLoadOutcome = "ok" | "error" | "stale";

/**
 * In-memory cache + abortable request logic for the ideas panel.
 * `planVersionRef` is shared with the workspace so stale requests are
 * discarded when the plan is replaced.
 */
export function useIdeas(
  plan: PlanSnapshot | null,
  planVersionRef: React.MutableRefObject<number>,
  setPlan: React.Dispatch<React.SetStateAction<PlanSnapshot | null>>,
) {
  const [ideasStatus, setIdeasStatus] = useState<IdeasStatus>("idle");
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [activeRefinement, setActiveRefinement] = useState<IdeaRefinement | null>(null);

  const ideasControllerRef = useRef<AbortController | null>(null);
  const ideasCacheRef = useRef(new Map<string, NonNullable<PlanSnapshot["ideas"]>>());
  const ideasRequestIdRef = useRef(0);

  const loadIdeas = useCallback(
    async (
      targetPlan: PlanSnapshot,
      refinement: IdeaRefinement | null,
      planVersion: number,
    ): Promise<IdeasLoadOutcome> => {
      const requestId = ++ideasRequestIdRef.current;
      ideasControllerRef.current?.abort();

      const isCurrent = () =>
        requestId === ideasRequestIdRef.current && planVersion === planVersionRef.current;

      const cacheKey = keyForRefinement(refinement);
      const cached = ideasCacheRef.current.get(cacheKey);
      if (cached) {
        if (!isCurrent()) return "stale";
        setPlan((current) => (current ? { ...current, ideas: cached } : current));
        setIdeasStatus("idle");
        setIdeasError(null);
        return "ok";
      }

      const controller = new AbortController();
      ideasControllerRef.current = controller;
      setIdeasStatus("loading");
      setIdeasError(null);

      try {
        const ideas = await requestIdeas(targetPlan.brief, refinement, controller.signal);
        if (!isCurrent()) return "stale";
        ideasCacheRef.current.set(cacheKey, ideas);
        setPlan((current) => (current ? { ...current, ideas } : current));
        setIdeasStatus("idle");
        return "ok";
      } catch (error) {
        if (!isCurrent()) return "stale";
        setIdeasStatus("error");
        setIdeasError(describeError(error));
        return "error";
      } finally {
        if (ideasControllerRef.current === controller) {
          ideasControllerRef.current = null;
        }
      }
    },
    [planVersionRef, setPlan],
  );

  const handleRefine = useCallback(
    async (refinement: IdeaRefinement | null) => {
      if (!plan || ideasStatus === "loading") return;
      const previous = activeRefinement;
      setActiveRefinement(refinement);
      const outcome = await loadIdeas(plan, refinement, planVersionRef.current);
      if (outcome === "error") setActiveRefinement(previous);
    },
    [plan, ideasStatus, activeRefinement, loadIdeas, planVersionRef],
  );

  const handleRetryIdeas = useCallback(() => {
    if (!plan) return;
    void loadIdeas(plan, activeRefinement, planVersionRef.current);
  }, [plan, activeRefinement, loadIdeas, planVersionRef]);

  const abortIdeas = useCallback(() => {
    ideasControllerRef.current?.abort();
  }, []);

  const clearIdeasCache = useCallback(() => {
    ideasCacheRef.current.clear();
  }, []);

  return {
    ideasStatus,
    ideasError,
    activeRefinement,
    setActiveRefinement,
    setIdeasStatus,
    setIdeasError,
    loadIdeas,
    handleRefine,
    handleRetryIdeas,
    abortIdeas,
    clearIdeasCache,
    ideasControllerRef,
    ideasCacheRef,
    ideasRequestIdRef,
  };
}
