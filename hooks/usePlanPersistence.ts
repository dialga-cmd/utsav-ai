"use client";

import { useEffect, useRef, useState } from "react";
import { saveStoredPlan } from "@/lib/storage";
import type { PlanSnapshot } from "@/types/plan";

export const PLAN_SAVE_DEBOUNCE_MS = 400;

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface SaveResult {
  plan: PlanSnapshot;
  status: "saved" | "failed";
}

/**
 * Persist edits after a short idle period. A pagehide/visibility flush catches
 * the final keystroke when the tab closes before the debounce expires.
 *
 * The visible status is derived by comparing the saved snapshot with the
 * current one, so no state is set synchronously from the persistence effect.
 */
export function usePlanPersistence(
  plan: PlanSnapshot | null,
  delay = PLAN_SAVE_DEBOUNCE_MS,
): SaveStatus {
  const [lastResult, setLastResult] = useState<SaveResult | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!plan) {
      pendingRef.current = false;
      return;
    }

    pendingRef.current = true;
    const planToSave = plan;
    const timer = setTimeout(() => {
      const saved = saveStoredPlan(planToSave);
      pendingRef.current = false;
      setLastResult({
        plan: planToSave,
        status: saved ? "saved" : "failed",
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [plan, delay]);

  useEffect(() => {
    if (!plan) return;
    const planToSave = plan;

    function flush() {
      if (!pendingRef.current) return;
      const saved = saveStoredPlan(planToSave);
      pendingRef.current = false;
      setLastResult({
        plan: planToSave,
        status: saved ? "saved" : "failed",
      });
    }

    function flushWhenHidden() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [plan]);

  if (!plan) return "idle";
  if (lastResult?.plan === plan) return lastResult.status;
  return "saving";
}
