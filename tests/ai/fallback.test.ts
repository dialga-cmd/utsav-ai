import { describe, expect, it } from "vitest";
import {
  buildFallbackIdeas,
  buildFallbackVendorMessage,
  buildFollowUps,
  extractEventFallback,
} from "@/lib/ai/fallback";
import { aiIdeasSchema } from "@/lib/schemas/ai";
import { buildBudget } from "@/lib/engine/budget";
import { inferCityTier, inferFoodPreference, inferMultiDay } from "@/lib/intake";
import { makeBrief } from "@/tests/factories";
import { IDEA_REFINEMENTS } from "@/types/ai";
import { EVENT_TYPES } from "@/types/event";

const NOW = new Date("2026-10-23T00:00:00.000Z");

describe("extractEventFallback", () => {
  it("extracts a complete Indian wedding brief from one sentence", () => {
    const result = extractEventFallback(
      "My sister's wedding in Jaipur on 15 Dec 2026 for 120 guests, budget ₹4.5 lakh, vegetarian.",
      NOW,
    );

    expect(result).toMatchObject({
      eventType: "wedding",
      eventDate: "2026-12-15",
      guests: 120,
      budgetInr: 450_000,
      city: "Jaipur",
      source: "fallback",
      followUps: [],
    });
  });

  it("parses lakh, crore and plain-rupee budgets", () => {
    expect(
      extractEventFallback("birthday for 20 guests, budget 1.2 crore", NOW).budgetInr,
    ).toBe(12_000_000);
    expect(
      extractEventFallback("community fair for 300 guests, budget 75,000", NOW).budgetInr,
    ).toBe(75_000);
    expect(
      extractEventFallback("birthday for 20 guests, budget 50000", NOW).budgetInr,
    ).toBe(50_000);
  });

  it("returns at most two follow-ups for missing critical fields", () => {
    const result = extractEventFallback("We are planning a party soon.", NOW);
    expect(result.eventType).toBeNull();
    expect(result.followUps).toHaveLength(2);
    expect(result.followUps.map((item) => item.field)).toEqual([
      "eventType",
      "eventDate",
    ]);

    expect(
      buildFollowUps({
        eventType: "birthday",
        eventDate: null,
        guests: null,
        budgetInr: null,
      }).map((item) => item.field),
    ).toEqual(["eventDate", "guests"]);
  });

  it("ignores impossible dates and unknown cities", () => {
    const result = extractEventFallback("Birthday on 31 Feb 2026 for 20 people", NOW);
    expect(result.eventDate).toBeNull();
    expect(result.city).toBeNull();
  });
});

describe("intake inference", () => {
  it("infers city tier, food and multi-day context", () => {
    expect(inferCityTier("Mumbai")).toBe("metro");
    expect(inferCityTier("Udaipur")).toBe("tier3");
    expect(inferCityTier("Indore")).toBe("tier2");
    expect(inferFoodPreference("pure veg Jain menu")).toBe("veg");
    expect(inferFoodPreference("chicken and fish counters")).toBe("non_veg");
    expect(inferFoodPreference("a family menu")).toBe("mixed");
    expect(inferMultiDay("haldi, mehendi and sangeet")).toBe(true);
    expect(inferMultiDay("one evening party")).toBe(false);
  });
});

describe("fallback ideas", () => {
  it.each(EVENT_TYPES)("returns schema-valid ideas for %s events", (eventType) => {
    const brief = makeBrief({ eventType });
    for (const refinement of [null, ...IDEA_REFINEMENTS] as const) {
      const ideas = buildFallbackIdeas(brief, refinement, buildBudget(brief));
      expect(ideas.source).toBe("fallback");
      expect(aiIdeasSchema.safeParse(ideas).success).toBe(true);
      expect(ideas.savings).toHaveLength(4);
    }
  });

  it("makes refinements visibly different", () => {
    const brief = makeBrief();
    const cheaper = buildFallbackIdeas(brief, "cheaper");
    const modern = buildFallbackIdeas(brief, "more_modern");
    expect(cheaper.theme).not.toBe(modern.theme);
    expect(cheaper.menu).not.toEqual(modern.menu);
  });

  it("uses exact budget terms in savings suggestions", () => {
    const brief = makeBrief({ guests: 100, budgetInr: 200_000 });
    const ideas = buildFallbackIdeas(brief, null);
    expect(ideas.savings.join(" ")).toContain("₹");
  });
});

describe("fallback vendor message", () => {
  it("drafts a useful message without inventing contact details", () => {
    const message = buildFallbackVendorMessage(
      makeBrief(),
      "Caterer",
      "Need a vegetarian menu",
    );
    expect(message.source).toBe("fallback");
    expect(message.subject).toContain("Caterer");
    expect(message.message).toContain("Jaipur");
    expect(message.message).toContain("itemised written quote");
    expect(message.message).not.toMatch(/\+91|\d{10}|@[a-z0-9.-]+\./i);
  });
});
