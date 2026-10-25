"use client";

import { useEffect, useRef, useState } from "react";
import { usePlanPersistence } from "@/hooks/usePlanPersistence";
import { useExtraction } from "@/hooks/useExtraction";
import { useIdeas } from "@/hooks/useIdeas";
import { useVendorMessages } from "@/hooks/useVendorMessages";
import { usePlanMutations } from "@/hooks/usePlanMutations";
import {
  createEmptyIntake,
  type IntakeErrors,
  type IntakeField,
  type IntakeFormValues,
} from "@/lib/intake";
import { clearStoredPlan, loadStoredPlan } from "@/lib/storage";
import { formatCalendarDate, startOfUtcDay } from "@/lib/engine/date";
import type { FollowUp } from "@/types/ai";
import type { AiSource, PlanSnapshot } from "@/types/plan";
import { type PlanNotice } from "@/components/plan/PlanView";

/**
 * All the state and side-effect logic for the planning workspace, extracted
 * from the presentational `PlanningWorkspace` shell so that component can
 * stay under ~250 lines.
 *
 * The hook owns:
 * - the persisted plan and intake form values
 * - extraction / demo / submit flows (via `useExtraction`)
 * - ideas, vendor messages, plan mutations, and localStorage persistence
 * - focus management between intake and plan views
 * - reset / start-over behaviour
 */
export function usePlanningWorkspace() {
  const [storedResult] = useState(loadStoredPlan);
  const [plan, setPlan] = useState<PlanSnapshot | null>(
    storedResult.status === "ok" ? storedResult.plan : null,
  );
  const [intake, setIntake] = useState<IntakeFormValues>(createEmptyIntake);
  const [freeText, setFreeText] = useState("");
  const [freeTextError, setFreeTextError] = useState<string | null>(null);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(
    storedResult.status === "invalid"
      ? "The saved plan could not be read, so it was removed. Nothing else was affected."
      : null,
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [extractionSource, setExtractionSource] = useState<AiSource | null>(null);
  const [planNotice, setPlanNotice] = useState<PlanNotice | null>(() => {
    if (
      storedResult.status === "ok" &&
      storedResult.plan.brief.eventDate < formatCalendarDate(startOfUtcDay(new Date()))
    ) {
      return {
        tone: "warning",
        title: "This saved plan is in the past",
        body: "The event date has passed. You can still read or print the plan, or start a new one with a future date.",
      };
    }
    return null;
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const planVersionRef = useRef(0);
  const focusRequestRef = useRef<null | { target: "plan" | "intake"; nonce: number }>(
    null,
  );

  const saveStatus = usePlanPersistence(plan);

  const {
    ideasStatus,
    ideasError,
    activeRefinement,
    loadIdeas,
    handleRefine,
    handleRetryIdeas,
    abortIdeas,
    clearIdeasCache,
    ideasControllerRef,
    setIdeasStatus,
    setIdeasError,
  } = useIdeas(plan, planVersionRef, setPlan);

  const {
    vendorMessageStates,
    setVendorMessageStates,
    handleDraftVendorMessage,
    abortVendorRequests,
  } = useVendorMessages(plan);

  const {
    handleBudgetPlannedChange,
    handleBudgetActualChange,
    handleToggleTask,
    handleVendorStatusChange,
    handleVendorQuoteChange,
  } = usePlanMutations(setPlan, clearIdeasCache);

  function applyPlan(nextPlan: PlanSnapshot, notice: PlanNotice | null) {
    planVersionRef.current += 1;
    ideasControllerRef.current?.abort();
    abortVendorRequests();
    clearIdeasCache();

    setPlan(nextPlan);
    setPlanNotice(notice);
    setIdeasStatus("loading");
    setIdeasError(null);
    setVendorMessageStates({});
    setConfirmReset(false);
    setErrors({});
    setFollowUps([]);
    setFreeTextError(null);
    setStatusMessage("");
    focusRequestRef.current = { target: "plan", nonce: Date.now() };

    const version = planVersionRef.current;
    void loadIdeas(nextPlan, null, version);
  }

  const { handleExtract, handleSubmit, handleDemo, abortExtraction } = useExtraction(
    freeText,
    intake,
    extractionSource,
    {
      applyPlan,
      setIntake,
      setErrors,
      setFollowUps,
      setStatusMessage,
      setExtractionSource,
      setIsExtracting,
      setFreeText,
      setFreeTextError,
    },
  );

  useEffect(() => {
    if (storedResult.status === "ok" && !storedResult.plan.ideas) {
      const version = planVersionRef.current;
      void loadIdeas(storedResult.plan, null, version);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!focusRequestRef.current) return;
    const element = document.getElementById(
      focusRequestRef.current.target === "plan" ? "plan-title" : "hero-heading",
    );
    element?.focus();
    focusRequestRef.current = null;
  });

  useEffect(() => {
    return () => {
      abortExtraction();
      abortIdeas();
      abortVendorRequests();
    };
  }, [abortExtraction, abortIdeas, abortVendorRequests]);

  function handleExample(text: string) {
    setFreeText(text);
    setFreeTextError(null);
    setErrors({});
    setFollowUps([]);
    setStatusMessage(
      "Example loaded. Read it as-is, or adjust the details in the form below.",
    );
  }

  function handleFieldChange(field: IntakeField, value: string) {
    setIntake((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFollowUps((current) =>
      current.some((followUp) => followUp.field === field)
        ? current.filter((followUp) => followUp.field !== field)
        : current,
    );
    setStatusMessage("");
  }

  function handleFreeTextChange(value: string) {
    setFreeText(value);
    setFreeTextError(null);
  }

  function handleStartOver() {
    setConfirmReset(true);
  }

  function handleCancelReset() {
    setConfirmReset(false);
  }

  function handleConfirmReset() {
    planVersionRef.current += 1;
    abortExtraction();
    abortIdeas();
    abortVendorRequests();
    clearStoredPlan();
    clearIdeasCache();

    setPlan(null);
    setPlanNotice(null);
    setConfirmReset(false);
    setRestoreNotice(null);
    setIntake(createEmptyIntake());
    setFreeText("");
    setFreeTextError(null);
    setErrors({});
    setFollowUps([]);
    setStatusMessage("");
    setExtractionSource(null);
    setIsExtracting(false);
    setVendorMessageStates({});
    focusRequestRef.current = { target: "intake", nonce: Date.now() };
  }

  function handlePrint() {
    window.print();
  }

  return {
    plan,
    intake,
    freeText,
    freeTextError,
    errors,
    followUps,
    restoreNotice,
    isExtracting,
    statusMessage,
    extractionSource,
    planNotice,
    confirmReset,
    saveStatus,
    ideasStatus,
    ideasError,
    activeRefinement,
    vendorMessageStates,
    handleExample,
    handleFieldChange,
    handleFreeTextChange,
    handleExtract,
    handleSubmit,
    handleDemo,
    handleStartOver,
    handleCancelReset,
    handleConfirmReset,
    handlePrint,
    handleBudgetPlannedChange,
    handleBudgetActualChange,
    handleToggleTask,
    handleVendorStatusChange,
    handleVendorQuoteChange,
    handleDraftVendorMessage,
    handleRefine,
    handleRetryIdeas,
    abortIdeas,
    clearIdeasCache,
  };
}
