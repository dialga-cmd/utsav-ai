"use client";

import { BudgetPanel } from "@/components/plan/BudgetPanel";
import { IdeasPanel, type IdeasStatus } from "@/components/plan/IdeasPanel";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { TimelinePanel } from "@/components/plan/TimelinePanel";
import { VendorsPanel, type VendorMessageMap } from "@/components/plan/VendorsPanel";
import { Notice, type NoticeTone } from "@/components/ui/Notice";
import { Container } from "@/components/ui/Container";
import type { SaveStatus } from "@/hooks/usePlanPersistence";
import { BUDGET_TIER_LABELS, CITY_TIER_LABELS, EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/engine/date";
import { formatInr, formatNumber } from "@/lib/format";
import type { PlanTotals } from "@/lib/plan";
import type { IdeaRefinement } from "@/types/ai";
import type { PlanSnapshot, VendorEntry, VendorStatus } from "@/types/plan";

export interface PlanNotice {
  tone: NoticeTone;
  title: string;
  body: string;
}

interface PlanViewProps {
  plan: PlanSnapshot;
  totals: PlanTotals;
  saveStatus: SaveStatus;
  planNotice: PlanNotice | null;
  confirmReset: boolean;
  ideasStatus: IdeasStatus;
  ideasError: string | null;
  activeRefinement: IdeaRefinement | null;
  vendorMessageStates: VendorMessageMap;
  onBudgetPlannedChange: (categoryId: string, amount: number) => void;
  onBudgetActualChange: (categoryId: string, amount: number | null) => void;
  onToggleTask: (taskId: string) => void;
  onVendorStatusChange: (vendorId: string, status: VendorStatus) => void;
  onVendorQuoteChange: (vendorId: string, quoteInr: number | null) => void;
  onDraftVendorMessage: (vendor: VendorEntry) => void;
  onRefine: (refinement: IdeaRefinement | null) => void;
  onRetryIdeas: () => void;
  onStartOver: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
  onPrint: () => void;
}

const SAVE_STATUS_TEXT: Record<Exclude<SaveStatus, "idle">, string> = {
  saving: "Saving changes in this browser…",
  saved: "Saved in this browser",
  failed: "Could not save to this browser",
};

/**
 * Complete plan presentation view: overview statistics, disclaimer notices,
 * tab panels (Budget, Timeline, Vendors, Ideas), and reset confirmation modal.
 */
export function PlanView({
  plan,
  totals,
  saveStatus,
  planNotice,
  confirmReset,
  ideasStatus,
  ideasError,
  activeRefinement,
  vendorMessageStates,
  onBudgetPlannedChange,
  onBudgetActualChange,
  onToggleTask,
  onVendorStatusChange,
  onVendorQuoteChange,
  onDraftVendorMessage,
  onRefine,
  onRetryIdeas,
  onStartOver,
  onCancelReset,
  onConfirmReset,
  onPrint,
}: PlanViewProps) {
  const { brief, timeline } = plan;
  const eventLabel = EVENT_TYPE_LABELS[brief.eventType];

  return (
    <div id="plan-workspace" className="workspace plan-shell">
      <Container>
        <p className="print-only">Utsav AI · working plan</p>

        <header className="plan-header">
          <div>
            <p className="plan-kicker">Your working plan</p>
            <h1 id="plan-title" className="plan-title" tabIndex={-1}>
              {eventLabel} in {brief.city}
            </h1>
            <div className="plan-meta">
              <span>
                <time dateTime={brief.eventDate}>
                  {formatDisplayDate(brief.eventDate)}
                </time>
              </span>
              <span>{formatNumber(brief.guests)} guests</span>
              <span>{CITY_TIER_LABELS[brief.cityTier]}</span>
              <span>
                {timeline.daysUntil} {timeline.daysUntil === 1 ? "day" : "days"} to go
              </span>
              <span>{BUDGET_TIER_LABELS[plan.budget.tier]} budget</span>
            </div>
          </div>
          <div className="plan-actions no-print">
            <button type="button" className="btn btn-secondary" onClick={onPrint}>
              <PrintIcon />
              Print / save PDF
            </button>
            <button type="button" className="btn btn-quiet" onClick={onStartOver}>
              Start a new plan
            </button>
          </div>
        </header>

        <p
          className="status-line mt-2 no-print"
          role={saveStatus === "failed" ? "alert" : undefined}
        >
          {saveStatus === "idle" ? "" : SAVE_STATUS_TEXT[saveStatus]}
        </p>

        {saveStatus === "failed" ? (
          <Notice tone="danger" title="Your edits may not survive a refresh">
            Browser storage is unavailable, possibly because of private browsing or a full
            device. Keep this tab open, or print the plan to keep a copy.
          </Notice>
        ) : null}

        {planNotice ? (
          <Notice
            tone={planNotice.tone}
            title={planNotice.title}
            className="plan-disclaimer"
          >
            {planNotice.body}
          </Notice>
        ) : null}

        <div className="stat-grid">
          <div className="stat">
            <p className="stat-label">Planned budget</p>
            <p className="stat-value">{formatInr(totals.plannedInr)}</p>
            <p className="stat-note">
              {brief.guests > 0
                ? `${formatInr(plan.budget.perGuestInr)} per guest`
                : "No guest count"}
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">Actual recorded</p>
            <p className="stat-value">{formatInr(totals.actualInr)}</p>
            <p className="stat-note">
              {totals.actualRecordedCount === 0
                ? "No actuals recorded yet"
                : `${totals.actualRecordedCount} of ${plan.budget.categories.length} lines recorded`}
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">Tasks done</p>
            <p className="stat-value">
              {totals.tasksDone}/{totals.tasksTotal}
            </p>
            <p className="stat-note">
              {totals.tasksDone === totals.tasksTotal
                ? "Everything is ticked"
                : `${totals.tasksTotal - totals.tasksDone} still open`}
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">Vendors booked</p>
            <p className="stat-value">
              {totals.vendorsBooked}/{totals.vendorsTotal}
            </p>
            <p className="stat-note">
              {totals.vendorsContacted} contacted · {formatInr(totals.quotedInr)} quoted
            </p>
          </div>
        </div>

        <Notice tone="info" title="Use this as a working draft">
          Budget lines are planning estimates, not vendor quotes. Confirm prices,
          availability, safety requirements and permissions locally. Utsav AI does not
          book vendors or process payments.
        </Notice>

        {confirmReset ? (
          <Notice tone="warning" live title="Start a new plan?" className="mt-3">
            This clears the plan saved in this browser, including budget edits, tasks and
            vendor notes. Print it first if you want a copy.
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={onConfirmReset}
              >
                Yes, clear and start over
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={onCancelReset}
              >
                Keep this plan
              </button>
            </div>
          </Notice>
        ) : null}

        <div className="mt-4">
          <PlanTabs
            tabs={[
              {
                id: "budget",
                label: "Budget",
                content: (
                  <BudgetPanel
                    plan={plan}
                    totals={totals}
                    onPlannedChange={onBudgetPlannedChange}
                    onActualChange={onBudgetActualChange}
                  />
                ),
              },
              {
                id: "timeline",
                label: "Timeline",
                content: (
                  <TimelinePanel
                    plan={plan}
                    totals={totals}
                    onToggleTask={onToggleTask}
                  />
                ),
              },
              {
                id: "vendors",
                label: "Vendors",
                content: (
                  <VendorsPanel
                    plan={plan}
                    messageStates={vendorMessageStates}
                    onStatusChange={onVendorStatusChange}
                    onQuoteChange={onVendorQuoteChange}
                    onDraftMessage={onDraftVendorMessage}
                  />
                ),
              },
              {
                id: "ideas",
                label: "Ideas",
                content: (
                  <IdeasPanel
                    plan={plan}
                    status={ideasStatus}
                    error={ideasError}
                    activeRefinement={activeRefinement}
                    onRefine={onRefine}
                    onRetry={onRetryIdeas}
                  />
                ),
              },
            ]}
          />
        </div>
      </Container>
    </div>
  );
}

function PrintIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}
