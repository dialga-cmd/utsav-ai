import type { EventBrief } from "@/types/event";

const BASE_BRIEF: EventBrief = {
  eventType: "wedding",
  eventDate: "2026-12-15",
  guests: 120,
  budgetInr: 450_000,
  city: "Jaipur",
  cityTier: "tier2",
  notes: "Traditional family wedding",
  foodPreference: "veg",
  multiDay: true,
};

export function makeBrief(overrides: Partial<EventBrief> = {}): EventBrief {
  return { ...BASE_BRIEF, ...overrides };
}
