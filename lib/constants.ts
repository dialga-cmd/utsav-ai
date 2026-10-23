import type { CityTier, EventType, FoodPreference } from "@/types/event";
import type { BudgetTier, TaskUrgency, VendorStatus } from "@/types/plan";
import type { IdeaRefinement } from "@/types/ai";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

export const CITY_TIER_LABELS: Record<CityTier, string> = {
  metro: "Metro",
  tier2: "Tier 2 city",
  tier3: "Tier 3 city / town",
};

export const FOOD_PREFERENCE_LABELS: Record<FoodPreference, string> = {
  veg: "Vegetarian",
  non_veg: "Non-vegetarian",
  mixed: "Mixed",
};

export const BUDGET_TIER_LABELS: Record<BudgetTier, string> = {
  economy: "Economy",
  standard: "Standard",
  premium: "Premium",
};

export const URGENCY_LABELS: Record<TaskUrgency, string> = {
  on_track: "On track",
  tight: "Tight",
  urgent: "Urgent",
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  not_contacted: "Not contacted",
  contacted: "Contacted",
  quoted: "Quote received",
  booked: "Booked",
};

export const REFINEMENT_LABELS: Record<IdeaRefinement, string> = {
  cheaper: "Make it cheaper",
  more_traditional: "More traditional",
  more_modern: "More modern",
  kid_friendly: "Kid-friendly",
};

export const DEMO_SCENARIO = {
  eventType: "wedding" as const,
  eventDate: "",
  guests: 120,
  budgetInr: 450000,
  city: "Jaipur",
  notes:
    "My sister's wedding in Jaipur. Around 120 guests, budget ₹4.5 lakh. We want a warm traditional feel with haldi, mehendi, sangeet and pheras, mostly vegetarian food, and a small reception.",
};
