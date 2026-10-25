import { describe, expect, it } from "vitest";
import {
  aiExtractionSchema,
  aiIdeasSchema,
  aiVendorMessageSchema,
  ideasRequestSchema,
  vendorMessageRequestSchema,
} from "@/lib/schemas/ai";
import {
  calendarDateSchema,
  eventBriefSchema,
  eventFormSchema,
} from "@/lib/schemas/event";
import { planSnapshotSchema } from "@/lib/schemas/plan";
import { makeBrief } from "@/tests/factories";
import { buildBudget } from "@/lib/engine/budget";
import { buildTimeline } from "@/lib/engine/timeline";
import { buildVendorChecklist } from "@/lib/engine/vendors";
import { buildFallbackIdeas } from "@/lib/ai/fallback";

const validIdeas = {
  theme: "A warm courtyard wedding",
  menu: ["Vegetarian thali", "Chaat counter"],
  activities: ["Haldi games", "Sangeet run sheet"],
  decor: ["Marigold garlands", "Brass lamps"],
  gifts: ["Brass diyas", "Sweet boxes"],
  savings: ["Trim ten guests", "Request package quotes"],
};

describe("event schemas", () => {
  it("accepts a valid brief and rejects impossible dates", () => {
    expect(eventBriefSchema.safeParse(makeBrief()).success).toBe(true);
    expect(calendarDateSchema.safeParse("2024-02-29").success).toBe(true);
    expect(calendarDateSchema.safeParse("2026-02-29").success).toBe(false);
    expect(calendarDateSchema.safeParse("15/12/2026").success).toBe(false);
  });

  it("rejects zero guests and bad budgets in the intake form", () => {
    expect(eventFormSchema.safeParse({ ...makeBrief(), guests: 0 }).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...makeBrief(), budgetInr: 0 }).success).toBe(
      false,
    );
    expect(eventFormSchema.safeParse({ ...makeBrief(), city: "" }).success).toBe(false);
  });

  it("caps unbounded input lengths", () => {
    const result = eventBriefSchema.safeParse({
      ...makeBrief(),
      notes: "x".repeat(1_201),
    });
    expect(result.success).toBe(false);
  });
});

describe("AI schemas", () => {
  it("accepts valid extraction and nulls missing fields", () => {
    const result = aiExtractionSchema.safeParse({
      eventType: "wedding",
      eventDate: "2026-12-15",
      guests: 120,
      budgetInr: 450_000,
      city: "Jaipur",
    });
    expect(result.success).toBe(true);

    expect(
      aiExtractionSchema.safeParse({
        eventType: null,
        eventDate: null,
        guests: null,
        budgetInr: null,
        city: null,
      }).success,
    ).toBe(true);
  });

  it("rejects malformed ideas and oversized arrays", () => {
    expect(aiIdeasSchema.safeParse(validIdeas).success).toBe(true);
    expect(aiIdeasSchema.safeParse({ ...validIdeas, menu: ["one"] }).success).toBe(false);
    expect(
      aiIdeasSchema.safeParse({
        ...validIdeas,
        activities: Array.from({ length: 7 }, (_, index) => `Activity ${index}`),
      }).success,
    ).toBe(false);
    expect(aiIdeasSchema.safeParse({ theme: "Only a theme" }).success).toBe(false);
  });

  it("rejects invalid vendor messages and request payloads", () => {
    expect(
      aiVendorMessageSchema.safeParse({
        subject: "Enquiry",
        message: "This message is long enough to pass the minimum.",
      }).success,
    ).toBe(true);
    expect(
      aiVendorMessageSchema.safeParse({ subject: "Enquiry", message: "short" }).success,
    ).toBe(false);
    expect(
      ideasRequestSchema.safeParse({
        brief: makeBrief(),
        refinement: "not-a-refinement",
      }).success,
    ).toBe(false);
    expect(
      vendorMessageRequestSchema.safeParse({
        brief: makeBrief(),
        vendorName: "C",
        notes: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("plan snapshot schema", () => {
  it("parses a complete persisted plan and rejects drift", () => {
    const brief = makeBrief();
    const timeline = buildTimeline(brief, {
      now: new Date("2026-01-15T00:00:00.000Z"),
    });
    expect(timeline.ok).toBe(true);
    if (!timeline.ok) return;

    const snapshot = {
      brief,
      budget: buildBudget(brief),
      timeline: timeline.plan,
      vendors: buildVendorChecklist("wedding"),
      ideas: buildFallbackIdeas(brief, null),
    };

    expect(planSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(planSnapshotSchema.safeParse({ ...snapshot, vendors: [] }).success).toBe(
      false,
    );
  });
});
