import type { CityTier, EventType } from "@/types/event";
import type { BudgetTier, TaskUrgency, VendorStatus } from "@/types/plan";
import type { IdeaRefinement } from "@/types/ai";

/**
 * Default Gemini model. Google has deprecated gemini-2.5-flash for new API
 * keys; gemini-3.5-flash is the current stable model that the project key
 * can access. Override with the GEMINI_MODEL env var if needed.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

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

export const EXAMPLE_PROMPTS = [
  {
    label: "Jaipur wedding",
    text: "My sister's wedding in Jaipur in December, around 120 guests, budget ₹4.5 lakh. We want haldi, mehendi, sangeet and pheras with vegetarian food.",
  },
  {
    label: "Kids' birthday",
    text: "A 7th birthday party in Pune for 30 guests, budget ₹25,000. It should be fun for kids, with a cake, games and simple snacks.",
  },
  {
    label: "RWA community day",
    text: "Our society in Indore is planning a community festival for about 250 people with a budget of ₹1.2 lakh. We need sound, food, safety and volunteers.",
  },
] as const;

export const DEMO_SCENARIO = {
  eventType: "wedding" as const,
  eventDate: "",
  guests: 120,
  budgetInr: 450000,
  city: "Jaipur",
  notes:
    "My sister's wedding in Jaipur. Around 120 guests, budget ₹4.5 lakh. We want a warm traditional feel with haldi, mehendi, sangeet and pheras, mostly vegetarian food, and a small reception.",
};
