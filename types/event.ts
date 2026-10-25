/** Supported occasion types. */
export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** City cost bands used by the budget engine. */
export const CITY_TIERS = ["metro", "tier2", "tier3"] as const;

export type CityTier = (typeof CITY_TIERS)[number];

/** Food preferences affect catering allocation and menu ideas. */
export const FOOD_PREFERENCES = ["veg", "non_veg", "mixed"] as const;

export type FoodPreference = (typeof FOOD_PREFERENCES)[number];

/** Normalized event brief used by every deterministic engine. */
export interface EventBrief {
  eventType: EventType;
  /** Calendar date in YYYY-MM-DD format. */
  eventDate: string;
  guests: number;
  budgetInr: number;
  city: string;
  cityTier: CityTier;
  notes: string;
  foodPreference: FoodPreference;
  multiDay: boolean;
}

/** Fields the intake flow treats as essential. */
export const CRITICAL_EVENT_FIELDS = [
  "eventType",
  "eventDate",
  "guests",
  "budgetInr",
] as const;

export type CriticalEventField = (typeof CRITICAL_EVENT_FIELDS)[number];
