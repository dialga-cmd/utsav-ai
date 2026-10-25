"use client";

import { useCallback, useRef } from "react";
import { extractEvent } from "@/lib/api/client";
import {
  createDemoIntake,
  intakeFromExtraction,
  parseIntakeValues,
  type IntakeErrors,
  type IntakeFormValues,
} from "@/lib/intake";
import { createPlanSnapshot } from "@/lib/plan";
import type { PlanSnapshot } from "@/types/plan";
import type { PlanNotice } from "@/components/plan/PlanView";
import type { FollowUp } from "@/types/ai";
import type { AiSource } from "@/types/plan";

const OFFLINE_NOTICE: PlanNotice = {
  tone: "info",
  title: "Built with the offline planner",
  body: "The AI reader was unavailable, so we used the built-in parser. Your plan is complete, but check the prefilled details and edit anything that needs correcting.",
};

const DEMO_NOTICE: PlanNotice = {
  tone: "info",
  title: "Sample plan: a Jaipur wedding",
  body: "This is a realistic sample so you can explore every section. Edit the budget, tick tasks and draft an enquiry, or start a new plan with your own details.",
};

interface ExtractionHandlers {
  /** Called when a valid plan should be shown. */
  applyPlan: (plan: PlanSnapshot, notice: PlanNotice | null) => void;
  setIntake: React.Dispatch<React.SetStateAction<IntakeFormValues>>;
  setErrors: (errors: IntakeErrors) => void;
  setFollowUps: (followUps: FollowUp[]) => void;
  setStatusMessage: (message: string) => void;
  setExtractionSource: (source: AiSource | null) => void;
  setIsExtracting: (isExtracting: boolean) => void;
  setFreeText: (value: string) => void;
  setFreeTextError: (value: string | null) => void;
}

/**
 * Free-text extraction, form submit, and demo shortcut.
 * Returns an `extractionControllerRef` so the caller can abort in-flight
 * requests on unmount or when a demo is triggered.
 */
export function useExtraction(
  freeText: string,
  intake: IntakeFormValues,
  extractionSource: AiSource | null,
  handlers: ExtractionHandlers,
) {
  const extractionControllerRef = useRef<AbortController | null>(null);

  const handleExtract = useCallback(async () => {
    const text = freeText.trim();
    if (text.length < 8) {
      handlers.setFreeTextError(
        "Add a little more detail, such as the event type, city or date.",
      );
      return;
    }

    extractionControllerRef.current?.abort();
    const controller = new AbortController();
    extractionControllerRef.current = controller;
    handlers.setIsExtracting(true);
    handlers.setFreeTextError(null);
    handlers.setStatusMessage("Reading your note and checking the details…");

    try {
      const extracted = await extractEvent(text, controller.signal);
      if (controller.signal.aborted) return;

      handlers.setExtractionSource(extracted.source);
      const values = intakeFromExtraction(extracted);
      handlers.setIntake(values);
      handlers.setErrors({});
      handlers.setFollowUps(extracted.followUps);

      if (extracted.followUps.length === 0) {
        const parsed = parseIntakeValues(values);
        if (!parsed.ok) {
          handlers.setErrors(parsed.errors);
          handlers.setStatusMessage(
            "One detail needs a correction before we can build the plan.",
          );
          return;
        }

        const result = createPlanSnapshot(parsed.brief);
        if (!result.ok) {
          handlers.setErrors({ eventDate: result.error });
          handlers.setStatusMessage(
            "One detail needs a correction before we can build the plan.",
          );
          return;
        }

        handlers.applyPlan(
          result.plan,
          extracted.source === "fallback" ? OFFLINE_NOTICE : null,
        );
        return;
      }

      handlers.setStatusMessage(
        extracted.source === "fallback"
          ? "The offline reader filled in what it could. Add the missing details below, then build your plan."
          : "We found the main details. Add the missing ones below, then build your plan.",
      );
    } catch {
      if (controller.signal.aborted) return;
      handlers.setStatusMessage("");
      handlers.setFreeTextError(
        "We could not read that note. Check your connection and try again, or use the form below.",
      );
    } finally {
      if (extractionControllerRef.current === controller) {
        extractionControllerRef.current = null;
      }
      if (!controller.signal.aborted) handlers.setIsExtracting(false);
    }
  }, [freeText, handlers, extractionControllerRef]);

  const handleSubmit = useCallback(() => {
    const parsed = parseIntakeValues(intake);
    if (!parsed.ok) {
      handlers.setErrors(parsed.errors);
      handlers.setStatusMessage("Check the highlighted fields, then build your plan.");
      return;
    }

    const result = createPlanSnapshot(parsed.brief);
    if (!result.ok) {
      handlers.setErrors({ eventDate: result.error });
      handlers.setStatusMessage("Check the event date, then build your plan.");
      return;
    }

    handlers.applyPlan(
      result.plan,
      extractionSource === "fallback" ? OFFLINE_NOTICE : null,
    );
  }, [intake, extractionSource, handlers]);

  const handleDemo = useCallback(() => {
    extractionControllerRef.current?.abort();
    extractionControllerRef.current = null;
    handlers.setIsExtracting(false);

    const values = createDemoIntake();
    const parsed = parseIntakeValues(values);
    if (!parsed.ok) {
      handlers.setErrors(parsed.errors);
      return;
    }

    handlers.setIntake(values);
    handlers.setFreeText(values.notes);
    handlers.setExtractionSource(null);
    const result = createPlanSnapshot(parsed.brief);
    if (!result.ok) {
      handlers.setErrors({ eventDate: result.error });
      return;
    }
    handlers.applyPlan(result.plan, DEMO_NOTICE);
  }, [handlers, extractionControllerRef]);

  const abortExtraction = useCallback(() => {
    extractionControllerRef.current?.abort();
  }, []);

  return {
    handleExtract,
    handleSubmit,
    handleDemo,
    abortExtraction,
    extractionControllerRef,
  };
}
