import { eventFormSchema } from "@/lib/schemas/event";
import {
  addCalendarDays,
  formatCalendarDate,
  parseCalendarDate,
  startOfUtcDay,
} from "@/lib/engine/date";
import { DEMO_SCENARIO } from "@/lib/constants";
import type { ExtractedEvent } from "@/types/ai";
import type { CityTier, EventBrief, FoodPreference } from "@/types/event";

export const INTAKE_FIELDS = [
  "eventType",
  "eventDate",
  "guests",
  "budgetInr",
  "city",
  "notes",
] as const;

export type IntakeField = (typeof INTAKE_FIELDS)[number];
export type IntakeErrors = Partial<Record<IntakeField, string>>;

export interface IntakeFormValues {
  eventType: EventBrief["eventType"];
  eventDate: string;
  guests: string;
  budgetInr: string;
  city: string;
  notes: string;
}

const INTAKE_FIELD_SET = new Set<string>(INTAKE_FIELDS);

export function createEmptyIntake(): IntakeFormValues {
  return {
    eventType: "wedding",
    eventDate: "",
    guests: "",
    budgetInr: "",
    city: "",
    notes: "",
  };
}

/** Populate the fallback form from validated free-text extraction. */
export function intakeFromExtraction(extracted: ExtractedEvent): IntakeFormValues {
  return {
    eventType: extracted.eventType ?? "wedding",
    eventDate: extracted.eventDate ?? "",
    guests: extracted.guests === null ? "" : String(extracted.guests),
    budgetInr: extracted.budgetInr === null ? "" : String(extracted.budgetInr),
    city: extracted.city ?? "",
    notes: extracted.notes,
  };
}

/** Build a demo brief dated comfortably in the future. */
export function createDemoIntake(now = new Date()): IntakeFormValues {
  return {
    eventType: DEMO_SCENARIO.eventType,
    eventDate: formatCalendarDate(addCalendarDays(startOfUtcDay(now), 150)),
    guests: String(DEMO_SCENARIO.guests),
    budgetInr: String(DEMO_SCENARIO.budgetInr),
    city: DEMO_SCENARIO.city,
    notes: DEMO_SCENARIO.notes,
  };
}

export type ParseIntakeResult =
  { ok: true; brief: EventBrief } | { ok: false; errors: IntakeErrors };

/**
 * Validate the controlled intake form and infer the context the deterministic
 * engines need (city band, food preference, multi-day cues).
 */
export function parseIntakeValues(
  values: IntakeFormValues,
  now = new Date(),
): ParseIntakeResult {
  const candidate = {
    eventType: values.eventType,
    eventDate: values.eventDate,
    guests: Number(values.guests),
    budgetInr: Number(values.budgetInr),
    city: values.city,
    notes: values.notes,
    cityTier: inferCityTier(values.city),
    foodPreference: inferFoodPreference(values.notes),
    multiDay: inferMultiDay(values.notes),
  };

  const parsed = eventFormSchema.safeParse(candidate);
  if (!parsed.success) {
    const errors: IntakeErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && INTAKE_FIELD_SET.has(field)) {
        const typedField = field as IntakeField;
        if (!errors[typedField]) errors[typedField] = issue.message;
      }
    }
    return { ok: false, errors };
  }

  const eventDate = parseCalendarDate(parsed.data.eventDate);
  if (eventDate && eventDate < startOfUtcDay(now)) {
    return {
      ok: false,
      errors: { eventDate: "Choose today or a future date." },
    };
  }

  return { ok: true, brief: parsed.data };
}

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
