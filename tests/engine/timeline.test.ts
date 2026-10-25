import { describe, expect, it } from "vitest";
import { differenceInCalendarDays, parseCalendarDate } from "@/lib/engine/date";
import { buildTimeline } from "@/lib/engine/timeline";
import { makeBrief } from "@/tests/factories";

const NOW = new Date("2026-01-15T00:00:00.000Z");

describe("buildTimeline", () => {
  it("back-plans each wedding task by its stated lead time", () => {
    const result = buildTimeline(makeBrief({ eventDate: "2026-12-15" }), {
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const event = parseCalendarDate("2026-12-15");
    const venue = result.plan.tasks.find((task) => task.id === "wedding-venue");
    expect(event).not.toBeNull();
    expect(venue?.dueDate).toBe("2026-03-20");
    expect(
      differenceInCalendarDays(
        parseCalendarDate(venue?.dueDate ?? "") ?? new Date(),
        event!,
      ),
    ).toBe(270);
    expect(venue?.done).toBe(false);
    expect(result.plan.compressed).toBe(false);
  });

  it("rejects past and impossible dates", () => {
    const past = buildTimeline(makeBrief({ eventDate: "2026-01-14" }), {
      now: NOW,
    });
    expect(past).toEqual({
      ok: false,
      code: "PAST_DATE",
      error: "The event date is in the past. Choose today or a future date.",
    });

    const invalid = buildTimeline(makeBrief({ eventDate: "2026-02-30" }), {
      now: NOW,
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.code).toBe("INVALID_DATE");
  });

  it("compresses a close schedule without scheduling tasks in the past", () => {
    const result = buildTimeline(makeBrief({ eventDate: "2026-01-25" }), {
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.plan.daysUntil).toBe(10);
    expect(result.plan.compressed).toBe(true);
    expect(
      result.plan.tasks.some(
        (task) => task.urgency === "urgent" || task.urgency === "tight",
      ),
    ).toBe(true);
    expect(
      result.plan.tasks.every(
        (task) => (parseCalendarDate(task.dueDate)?.getTime() ?? 0) >= NOW.getTime(),
      ),
    ).toBe(true);
  });

  it("marks every task urgent when the event is today", () => {
    const result = buildTimeline(makeBrief({ eventDate: "2026-01-15" }), {
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.plan.daysUntil).toBe(0);
    expect(result.plan.tasks.every((task) => task.urgency === "urgent")).toBe(true);
    expect(result.plan.tasks.every((task) => task.dueDate === "2026-01-15")).toBe(true);
  });

  it("handles leap-day events and month-end dates", () => {
    const leap = buildTimeline(makeBrief({ eventDate: "2024-02-29" }), {
      now: new Date("2024-02-28T00:00:00.000Z"),
    });
    expect(leap.ok).toBe(true);
    if (leap.ok) {
      expect(leap.plan.daysUntil).toBe(1);
      expect(leap.plan.tasks.every((task) => parseCalendarDate(task.dueDate))).toBe(true);
    }

    const monthEnd = buildTimeline(makeBrief({ eventDate: "2026-03-31" }), {
      now: new Date("2026-01-31T00:00:00.000Z"),
    });
    expect(monthEnd.ok).toBe(true);
    if (monthEnd.ok) {
      expect(monthEnd.plan.daysUntil).toBe(59);
      expect(
        monthEnd.plan.tasks.every((task) => parseCalendarDate(task.dueDate) !== null),
      ).toBe(true);
    }
  });

  it("sorts by due date and keeps event-specific cultural tasks", () => {
    const result = buildTimeline(
      makeBrief({ eventType: "wedding", eventDate: "2026-12-15" }),
      { now: NOW },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const dueDates = result.plan.tasks.map((task) => task.dueDate);
    expect(dueDates).toEqual([...dueDates].sort());
    expect(result.plan.tasks.some((task) => task.title.includes("haldi"))).toBe(true);
    expect(result.plan.tasks.some((task) => task.title.includes("mehendi"))).toBe(true);
    expect(result.plan.tasks.some((task) => task.title.includes("sangeet"))).toBe(true);
    expect(result.plan.tasks.some((task) => task.title.includes("pheras"))).toBe(true);
  });

  it("includes permissions and safety work for community events", () => {
    const result = buildTimeline(
      makeBrief({
        eventType: "community",
        eventDate: "2026-04-15",
        notes: "RWA community gathering",
      }),
      { now: NOW },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.plan.tasks.some((task) => task.title.toLowerCase().includes("permission")),
    ).toBe(true);
    expect(
      result.plan.tasks.some((task) => task.title.toLowerCase().includes("safety")),
    ).toBe(true);
    expect(result.plan.tasks.some((task) => task.urgency === "urgent")).toBe(false);
  });
});
