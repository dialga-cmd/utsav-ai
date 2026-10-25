import { describe, expect, it } from "vitest";
import {
  buildFallbackIdeas,
  buildFallbackVendorMessage,
  buildFollowUps,
  extractEventFallback,
} from "@/lib/ai/fallback";
import { makeBrief } from "@/tests/factories";
import { buildBudget } from "@/lib/engine/budget";

describe("fallback engine extras", () => {
  it("extractEventFallback parses city, guests, budget, and date", () => {
    const res = extractEventFallback(
      "Wedding in Jaipur on 15 December 2027 for 120 guests with budget 450000",
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(res.city).toBe("Jaipur");
    expect(res.guests).toBe(120);
    expect(res.budgetInr).toBe(450000);
    expect(res.eventType).toBe("wedding");
  });
  it("extractEventFallback parses numeric slash dates and month-first dates", () => {
    const resSlash = extractEventFallback(
      "Birthday in Pune on 15/12/2027 for 50 guests",
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(resSlash.eventDate).toBe("2027-12-15");

    const resMonthFirst = extractEventFallback(
      "Community event in Delhi on October 15, 2027",
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(resMonthFirst.eventDate).toBe("2027-10-15");
  });
  it("extractEventFallback returns nulls when nothing is parseable", () => {
    const res = extractEventFallback(
      "I need to plan something but not sure when",
      new Date("2026-06-01T00:00:00Z"),
    );
    expect(res.city).toBeNull();
    expect(res.guests).toBeNull();
  });
  it("buildFollowUps flags missing fields", () => {
    const extracted = {
      eventType: "wedding" as const,
      eventDate: null,
      guests: 120,
      budgetInr: 450000,
      city: "Jaipur",
      notes: "",
      source: "fallback" as const,
      followUps: [],
    };
    const followUps = buildFollowUps(extracted);
    expect(followUps.length).toBeGreaterThan(0);
  });
  it("buildFallbackIdeas produces idea groups", () => {
    const budget = buildBudget(makeBrief());
    const ideas = buildFallbackIdeas(makeBrief(), null, budget);
    expect(ideas.theme).toBeTruthy();
    expect(ideas.menu.length).toBeGreaterThan(0);
    expect(ideas.source).toBe("fallback");
  });
  it("buildFallbackVendorMessage builds subject and body", () => {
    const brief = makeBrief();
    const msg = buildFallbackVendorMessage(brief, "Caterer", "Notes here");
    expect(msg.subject).toContain("Caterer");
    expect(msg.message.length).toBeGreaterThan(20);
    expect(msg.source).toBe("fallback");
  });
});
