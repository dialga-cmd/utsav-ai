"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IntakePanel } from "@/components/intake/IntakePanel";
import { PlanView, type PlanNotice } from "@/components/plan/PlanView";
import type { VendorMessageMap } from "@/components/plan/VendorsPanel";
import { Container } from "@/components/ui/Container";
import { usePlanPersistence } from "@/hooks/usePlanPersistence";
import { extractEvent, requestIdeas, requestVendorMessage } from "@/lib/api/client";
import {
  createDemoIntake,
  createEmptyIntake,
  intakeFromExtraction,
  parseIntakeValues,
  type IntakeErrors,
  type IntakeField,
  type IntakeFormValues,
} from "@/lib/intake";
import {
  createPlanSnapshot,
  getPlanTotals,
  setBudgetActual,
  setBudgetPlanned,
  setVendorQuote,
  setVendorStatus,
  toggleTimelineTask,
} from "@/lib/plan";
import { clearStoredPlan, loadStoredPlan } from "@/lib/storage";
import { formatCalendarDate, startOfUtcDay } from "@/lib/engine/date";
import type { FollowUp, IdeaRefinement } from "@/types/ai";
import type { AiSource } from "@/types/plan";
import type { PlanSnapshot, VendorEntry, VendorStatus } from "@/types/plan";
import type { IdeasStatus } from "@/components/plan/IdeasPanel";

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

const IDEA_FAILED_FALLBACK =
  "The service could not be reached. Check your connection and try again.";

type IdeasLoadOutcome = "ok" | "error" | "stale";

function describeError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "The request took too long. Please try again.";
  }
  if (error instanceof Error && error.message && error.name !== "TypeError") {
    return error.message;
  }
  return IDEA_FAILED_FALLBACK;
}

function keyForRefinement(refinement: IdeaRefinement | null): string {
  return refinement ?? "original";
}

export function PlanningWorkspace() {
  const [hydrated, setHydrated] = useState(false);
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
  const [intake, setIntake] = useState<IntakeFormValues>(createEmptyIntake);
  const [freeText, setFreeText] = useState("");
  const [freeTextError, setFreeTextError] = useState<string | null>(null);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [extractionSource, setExtractionSource] = useState<AiSource | null>(null);
  const [planNotice, setPlanNotice] = useState<PlanNotice | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    target: "plan" | "intake";
    nonce: number;
  } | null>(null);

  const [ideasStatus, setIdeasStatus] = useState<IdeasStatus>("idle");
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [activeRefinement, setActiveRefinement] = useState<IdeaRefinement | null>(null);
  const [vendorMessageStates, setVendorMessageStates] = useState<VendorMessageMap>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const extractionControllerRef = useRef<AbortController | null>(null);
  const ideasControllerRef = useRef<AbortController | null>(null);
  const vendorControllersRef = useRef(new Map<string, AbortController>());
  const ideasCacheRef = useRef(new Map<string, NonNullable<PlanSnapshot["ideas"]>>());
  const ideasRequestIdRef = useRef(0);
  const planVersionRef = useRef(0);
  const saveStatus = usePlanPersistence(plan);

  const abortVendorRequests = useCallback(() => {
    for (const controller of vendorControllersRef.current.values()) {
      controller.abort();
    }
    vendorControllersRef.current.clear();
  }, []);

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
    [],
  );

  const applyPlan = useCallback(
    (nextPlan: PlanSnapshot, notice: PlanNotice | null) => {
      planVersionRef.current += 1;
      ideasRequestIdRef.current += 1;
      ideasControllerRef.current?.abort();
      abortVendorRequests();
      ideasCacheRef.current.clear();

      setPlan(nextPlan);
      setPlanNotice(notice);
      setIdeasStatus("loading");
      setIdeasError(null);
      setActiveRefinement(null);
      setVendorMessageStates({});
      setConfirmReset(false);
      setErrors({});
      setFollowUps([]);
      setFreeTextError(null);
      setStatusMessage("");
      setFocusRequest({ target: "plan", nonce: Date.now() });

      const version = planVersionRef.current;
      void loadIdeas(nextPlan, null, version);
    },
    [abortVendorRequests, loadIdeas],
  );

  useEffect(() => {
    const stored = loadStoredPlan();
    if (stored.status === "ok") {
      setPlan(stored.plan);
      if (stored.plan.brief.eventDate < formatCalendarDate(startOfUtcDay(new Date()))) {
        setPlanNotice({
          tone: "warning",
          title: "This saved plan is in the past",
          body: "The event date has passed. You can still read or print the plan, or start a new one with a future date.",
        });
      }
      if (!stored.plan.ideas) {
        const version = planVersionRef.current;
        void loadIdeas(stored.plan, null, version);
      }
    } else if (stored.status === "invalid") {
      setRestoreNotice(
        "The saved plan could not be read, so it was removed. Nothing else was affected.",
      );
    }
    setHydrated(true);
  }, [loadIdeas]);

  useEffect(() => {
    if (!focusRequest) return;
    const element = document.getElementById(
      focusRequest.target === "plan" ? "plan-title" : "hero-heading",
    );
    element?.focus();
  }, [focusRequest]);

  useEffect(() => {
    return () => {
      extractionControllerRef.current?.abort();
      ideasControllerRef.current?.abort();
      abortVendorRequests();
    };
  }, [abortVendorRequests]);

  const totals = useMemo(() => (plan ? getPlanTotals(plan) : null), [plan]);

  function resetIntakeState() {
    setIntake(createEmptyIntake());
    setFreeText("");
    setFreeTextError(null);
    setErrors({});
    setFollowUps([]);
    setStatusMessage("");
    setExtractionSource(null);
  }

  async function handleExtract() {
    const text = freeText.trim();
    if (text.length < 8) {
      setFreeTextError("Add a little more detail, such as the event type, city or date.");
      return;
    }

    extractionControllerRef.current?.abort();
    const controller = new AbortController();
    extractionControllerRef.current = controller;
    setIsExtracting(true);
    setFreeTextError(null);
    setStatusMessage("Reading your note and checking the details…");

    try {
      const extracted = await extractEvent(text, controller.signal);
      if (controller.signal.aborted) return;

      setExtractionSource(extracted.source);
      const values = intakeFromExtraction(extracted);
      setIntake(values);
      setErrors({});
      setFollowUps(extracted.followUps);

      if (extracted.followUps.length === 0) {
        const parsed = parseIntakeValues(values);
        if (!parsed.ok) {
          setErrors(parsed.errors);
          setStatusMessage("One detail needs a correction before we can build the plan.");
          return;
        }

        const result = createPlanSnapshot(parsed.brief);
        if (!result.ok) {
          setErrors({ eventDate: result.error });
          setStatusMessage("One detail needs a correction before we can build the plan.");
          return;
        }

        applyPlan(result.plan, extracted.source === "fallback" ? OFFLINE_NOTICE : null);
        return;
      }

      setStatusMessage(
        extracted.source === "fallback"
          ? "The offline reader filled in what it could. Add the missing details below, then build your plan."
          : "We found the main details. Add the missing ones below, then build your plan.",
      );
    } catch {
      if (controller.signal.aborted) return;
      setStatusMessage("");
      setFreeTextError(
        "We could not read that note. Check your connection and try again, or use the form below.",
      );
    } finally {
      if (extractionControllerRef.current === controller) {
        extractionControllerRef.current = null;
      }
      if (!controller.signal.aborted) setIsExtracting(false);
    }
  }

  function handleSubmit() {
    const parsed = parseIntakeValues(intake);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setStatusMessage("Check the highlighted fields, then build your plan.");
      return;
    }

    const result = createPlanSnapshot(parsed.brief);
    if (!result.ok) {
      setErrors({ eventDate: result.error });
      setStatusMessage("Check the event date, then build your plan.");
      return;
    }

    applyPlan(result.plan, extractionSource === "fallback" ? OFFLINE_NOTICE : null);
  }

  function handleDemo() {
    extractionControllerRef.current?.abort();
    extractionControllerRef.current = null;
    setIsExtracting(false);

    const values = createDemoIntake();
    const parsed = parseIntakeValues(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    setIntake(values);
    setFreeText(values.notes);
    setExtractionSource(null);
    const result = createPlanSnapshot(parsed.brief);
    if (!result.ok) {
      setErrors({ eventDate: result.error });
      return;
    }
    applyPlan(result.plan, DEMO_NOTICE);
  }

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

  function handleBudgetPlannedChange(categoryId: string, amount: number) {
    setPlan((current) =>
      current ? setBudgetPlanned(current, categoryId, amount) : current,
    );
    ideasCacheRef.current.clear();
  }

  function handleBudgetActualChange(categoryId: string, amount: number | null) {
    setPlan((current) =>
      current ? setBudgetActual(current, categoryId, amount) : current,
    );
  }

  function handleToggleTask(taskId: string) {
    setPlan((current) => (current ? toggleTimelineTask(current, taskId) : current));
  }

  function handleVendorStatusChange(vendorId: string, status: VendorStatus) {
    setPlan((current) =>
      current ? setVendorStatus(current, vendorId, status) : current,
    );
  }

  function handleVendorQuoteChange(vendorId: string, quoteInr: number | null) {
    setPlan((current) =>
      current ? setVendorQuote(current, vendorId, quoteInr) : current,
    );
  }

  async function handleDraftVendorMessage(vendor: VendorEntry) {
    if (!plan) return;

    vendorControllersRef.current.get(vendor.id)?.abort();
    const controller = new AbortController();
    vendorControllersRef.current.set(vendor.id, controller);
    setVendorMessageStates((current) => ({
      ...current,
      [vendor.id]: { status: "loading" },
    }));

    try {
      const message = await requestVendorMessage(
        plan.brief,
        vendor.name,
        plan.brief.notes,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setVendorMessageStates((current) => ({
        ...current,
        [vendor.id]: { status: "ready", data: message },
      }));
    } catch (error) {
      if (controller.signal.aborted) return;
      setVendorMessageStates((current) => ({
        ...current,
        [vendor.id]: { status: "error", error: describeError(error) },
      }));
    } finally {
      if (vendorControllersRef.current.get(vendor.id) === controller) {
        vendorControllersRef.current.delete(vendor.id);
      }
    }
  }

  async function handleRefine(refinement: IdeaRefinement | null) {
    if (!plan || ideasStatus === "loading") return;

    const previous = activeRefinement;
    setActiveRefinement(refinement);
    const outcome = await loadIdeas(plan, refinement, planVersionRef.current);
    if (outcome === "error") setActiveRefinement(previous);
  }

  function handleRetryIdeas() {
    if (!plan) return;
    void loadIdeas(plan, activeRefinement, planVersionRef.current);
  }

  function handleStartOver() {
    setConfirmReset(true);
  }

  function handleCancelReset() {
    setConfirmReset(false);
  }

  function handleConfirmReset() {
    planVersionRef.current += 1;
    ideasRequestIdRef.current += 1;
    extractionControllerRef.current?.abort();
    extractionControllerRef.current = null;
    ideasControllerRef.current?.abort();
    ideasControllerRef.current = null;
    abortVendorRequests();
    clearStoredPlan();

    setPlan(null);
    setPlanNotice(null);
    setIdeasStatus("idle");
    setIdeasError(null);
    setActiveRefinement(null);
    setVendorMessageStates({});
    ideasCacheRef.current.clear();
    setIsExtracting(false);
    setConfirmReset(false);
    setRestoreNotice(null);
    resetIntakeState();
    setFocusRequest({ target: "intake", nonce: Date.now() });
  }

  function handlePrint() {
    window.print();
  }

  if (!hydrated) {
    return (
      <div id="plan-workspace" className="workspace">
        <Container>
          <div className="workspace-loading" role="status">
            <p>
              <span className="spinner" aria-hidden="true" /> Loading your saved plan…
            </p>
          </div>
        </Container>
      </div>
    );
  }

  if (!plan || !totals) {
    return (
      <IntakePanel
        values={intake}
        errors={errors}
        freeText={freeText}
        freeTextError={freeTextError}
        followUps={followUps}
        restoreNotice={restoreNotice}
        isExtracting={isExtracting}
        statusMessage={statusMessage}
        onFreeTextChange={(value) => {
          setFreeText(value);
          setFreeTextError(null);
        }}
        onExample={handleExample}
        onDemo={handleDemo}
        onExtract={() => void handleExtract()}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <PlanView
      plan={plan}
      totals={totals}
      saveStatus={saveStatus}
      planNotice={planNotice}
      confirmReset={confirmReset}
      ideasStatus={ideasStatus}
      ideasError={ideasError}
      activeRefinement={activeRefinement}
      vendorMessageStates={vendorMessageStates}
      onBudgetPlannedChange={handleBudgetPlannedChange}
      onBudgetActualChange={handleBudgetActualChange}
      onToggleTask={handleToggleTask}
      onVendorStatusChange={handleVendorStatusChange}
      onVendorQuoteChange={handleVendorQuoteChange}
      onDraftVendorMessage={(vendor) => void handleDraftVendorMessage(vendor)}
      onRefine={(refinement) => void handleRefine(refinement)}
      onRetryIdeas={handleRetryIdeas}
      onStartOver={handleStartOver}
      onCancelReset={handleCancelReset}
      onConfirmReset={handleConfirmReset}
      onPrint={handlePrint}
    />
  );
}
