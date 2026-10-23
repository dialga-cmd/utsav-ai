import type { CityTier, FoodPreference } from "@/types/event";

const METRO_CITIES = new Set([
  "bengaluru",
  "bangalore",
  "chennai",
  "delhi",
  "gurugram",
  "gurgaon",
  "hyderabad",
  "kolkata",
  "mumbai",
  "navi mumbai",
  "new delhi",
  "noida",
  "pune",
]);

const TIER_3_CITIES = new Set([
  "alwar",
  "bareilly",
  "bhilai",
  "darbhanga",
  "gaya",
  "guntur",
  "hisar",
  "jhansi",
  "karnal",
  "kolhapur",
  "kota",
  "mathura",
  "moradabad",
  "muzaffarpur",
  "nellore",
  "panipat",
  "rajahmundry",
  "rohtak",
  "salem",
  "siliguri",
  "tirupati",
  "udaipur",
  "warangal",
]);

/** Use a small city lookup, then default to a tier 2 cost band. */
export function inferCityTier(city: string): CityTier {
  const normalized = city.trim().toLowerCase();
  if (METRO_CITIES.has(normalized)) return "metro";
  if (TIER_3_CITIES.has(normalized)) return "tier3";
  return "tier2";
}

/** Infer food preference from intake language without assuming a default diet. */
export function inferFoodPreference(text: string): FoodPreference {
  const normalized = text.toLowerCase();
  if (/\b(non[- ]?veg|non[- ]?vegetarian|chicken|mutton|fish|prawn)\b/.test(normalized)) {
    return "non_veg";
  }
  if (/\b(veg|vegetarian|satvik|jain)\b/.test(normalized)) return "veg";
  return "mixed";
}

/** Multi-day cues include the traditional wedding ceremonies and explicit counts. */
export function inferMultiDay(text: string): boolean {
  return /\b(multi[- ]?day|three[- ]?day|3[- ]?day|two[- ]?day|haldi|mehendi|sangeet)\b/i.test(
    text,
  );
}
