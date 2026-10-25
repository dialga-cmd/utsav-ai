"use client";

import { URGENCY_LABELS } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/engine/date";
import type { PlanTotals } from "@/lib/plan";
import type { PlanSnapshot, TaskUrgency } from "@/types/plan";

const URGENCY_BADGE: Record<TaskUrgency, string> = {
  on_track: "badge-good",
  tight: "badge-warn",
  urgent: "badge-danger",
};

interface TimelinePanelProps {
  plan: PlanSnapshot;
  totals: PlanTotals;
  onToggleTask: (taskId: string) => void;
}

/**
 * Interactive countdown timeline: back-planned task execution, urgency indicators,
 * completion toggles, and countdown progress bar.
 */
export function TimelinePanel({ plan, totals, onToggleTask }: TimelinePanelProps) {
  const { timeline } = plan;
  const progress =
    totals.tasksTotal > 0 ? Math.round((totals.tasksDone / totals.tasksTotal) * 100) : 0;

  return (
    <div>
      <div className="panel-toolbar">
        <div>
          <h2 id="timeline-heading" className="panel-heading">
            Timeline
          </h2>
          <p className="panel-copy">
            Back-planned from the event date. Tick tasks when they are genuinely finished,
            not when a vendor says “almost done”.
          </p>
        </div>
        <span className="badge badge-neutral">
          {timeline.daysUntil} {timeline.daysUntil === 1 ? "day" : "days"} to go
        </span>
      </div>

      <div className="mb-3">
        <div
          className="flex items-center justify-between gap-2 text-sm"
          aria-hidden="true"
        >
          <span className="font-semibold">Task progress</span>
          <span className="text-[var(--color-muted)]">
            {totals.tasksDone} of {totals.tasksTotal} done
          </span>
        </div>
        <div
          className="budget-bar no-print"
          role="progressbar"
          aria-label="Tasks completed"
          aria-valuemin={0}
          aria-valuemax={totals.tasksTotal}
          aria-valuenow={totals.tasksDone}
          aria-valuetext={`${totals.tasksDone} of ${totals.tasksTotal} tasks done`}
        >
          <span className="budget-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {timeline.compressed ? (
        <p className="notice notice-warning mb-3">
          <strong>Your date is sooner than some lead times.</strong>
          Long-lead tasks have been pulled into the time you have and marked tight or
          urgent. Call the most important vendors first.
        </p>
      ) : null}

      {totals.tasksDone === totals.tasksTotal ? (
        <p className="notice notice-success mb-3">
          <strong>Every task is ticked.</strong>
          Do one final read-through with the venue and your family leads before the event.
        </p>
      ) : null}

      <ul className="task-list">
        {timeline.tasks.map((task) => (
          <li key={task.id} className={`task ${task.done ? "task-done" : ""}`.trim()}>
            <div className="task-top">
              <input
                id={`task-${task.id}`}
                type="checkbox"
                className="task-checkbox no-print"
                checked={task.done}
                onChange={() => onToggleTask(task.id)}
              />
              <div className="min-w-0">
                <label htmlFor={`task-${task.id}`} className="task-title cursor-pointer">
                  {task.title}
                </label>
                <p className="task-description">{task.description}</p>
              </div>
            </div>
            <div className="task-meta">
              <span className="badge badge-neutral">{task.phase}</span>
              {task.done ? (
                <span className="badge badge-good">Done</span>
              ) : (
                <span className={`badge ${URGENCY_BADGE[task.urgency]}`}>
                  {URGENCY_LABELS[task.urgency]}
                </span>
              )}
              {task.compressed && !task.done ? (
                <span className="badge badge-warn">Pulled forward</span>
              ) : null}
              <span>
                Due <time dateTime={task.dueDate}>{formatDisplayDate(task.dueDate)}</time>
              </span>
              <span className="print-only">
                {task.done ? "Status: done" : "Status: not done"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
