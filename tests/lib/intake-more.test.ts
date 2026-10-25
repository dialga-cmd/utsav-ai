import { describe, expect, it } from "vitest";
import {
  createEmptyIntake,
  createDemoIntake,
  intakeFromExtraction,
  inferCityTier,
  inferFoodPreference,
  inferMultiDay,
  parseIntakeValues,
  type IntakeFormValues,
} from "@/lib/intake";
import type { ExtractedEvent } from "@/types/ai";

describe("intake inferences", () => {
  it("infers city tiers", () => {
    expect(inferCityTier("Mumbai")).toBe("metro");
    expect(inferCityTier("Mumbai ")).toBe("metro");
    expect(inferCityTier("Udaipur")).toBe("tier3");
    expect(inferCityTier("Rampur")).toBe("tier2");
  });
  it("infers food preference", () => {
    expect(inferFoodPreference("We are vegetarian")).toBe("veg");
    expect(inferFoodPreference("satvik food")).toBe("veg");
    expect(inferFoodPreference("non-veg please")).toBe("non_veg");
    expect(inferFoodPreference("chicken and mutton")).toBe("non_veg");
    expect(inferFoodPreference("fish prawn")).toBe("non_veg");
    expect(inferFoodPreference("no preference")).toBe("mixed");
  });
  it("infers multi-day", () => {
    expect(inferMultiDay("multi-day event")).toBe(true);
    expect(inferMultiDay("Three-day wedding")).toBe(true);
    expect(inferMultiDay("3 day sangeet")).toBe(true);
    expect(inferMultiDay("haldi morning")).toBe(true);
    expect(inferMultiDay("mehendi afternoon")).toBe(true);
    expect(inferMultiDay("just one night")).toBe(false);
  });
  it("parses valid intake values", () => {
    const values: IntakeFormValues = {
      ...createEmptyIntake(),
      eventDate: "2027-05-01",
      guests: "100",
      budgetInr: "450000",
      city: "Pune",
      notes: "vegetarian wedding with sangeet",
    };
    const res = parseIntakeValues(values);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.brief.cityTier).toBe("metro");
    expect(res.brief.foodPreference).toBe("veg");
    expect(res.brief.multiDay).toBe(true);
  });
  it("rejects past dates", () => {
    const values: IntakeFormValues = {
      ...createEmptyIntake(),
      eventDate: "2000-01-01",
      guests: "100",
      budgetInr: "450000",
      city: "Pune",
    };
    const res = parseIntakeValues(values);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.eventDate).toBeTruthy();
  });
  it("rejects bad numbers with field errors", () => {
    const values: IntakeFormValues = {
      ...createEmptyIntake(),
      eventDate: "2027-05-01",
      guests: "abc",
      budgetInr: "",
      city: "Pune",
    };
    const res = parseIntakeValues(values);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.guests).toBeTruthy();
  });
  it("builds demo intake with future date", () => {
    const demo = createDemoIntake(new Date("2026-06-01T00:00:00Z"));
    expect(demo.guests).toBe("120");
    expect(demo.budgetInr).toBe("450000");
    expect(demo.city).toBe("Jaipur");
  });
  it("intakeFromExtraction maps nulls to empty", () => {
    const extracted: ExtractedEvent = {
      eventType: null,
      eventDate: null,
      guests: null,
      budgetInr: null,
      city: null,
      notes: "some note",
      followUps: [],
      source: "fallback",
    };
    const values = intakeFromExtraction(extracted);
    expect(values.eventType).toBe("wedding");
    expect(values.guests).toBe("");
    expect(values.budgetInr).toBe("");
    expect(values.city).toBe("");
  });
});
