"use client";

import { useMemo } from "react";
import { IntakePanel } from "@/components/intake/IntakePanel";
import { PlanView } from "@/components/plan/PlanView";
import { usePlanningWorkspace } from "@/hooks/usePlanningWorkspace";
import { getPlanTotals } from "@/lib/plan";

/**
 * Presentational shell for the planning workspace. All state and
 * side-effect logic lives in `usePlanningWorkspace`; this component
 * just branches on whether a plan exists and delegates to either
 * `IntakePanel` or `PlanView`.
 */
export function PlanningWorkspace() {
  const {
    plan,
    intake,
    freeText,
    freeTextError,
    errors,
    followUps,
    restoreNotice,
    isExtracting,
    statusMessage,
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
  } = usePlanningWorkspace();

  const totals = useMemo(() => (plan ? getPlanTotals(plan) : null), [plan]);

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
        onFreeTextChange={handleFreeTextChange}
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
