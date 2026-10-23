import { z } from "zod";
import { parseCalendarDate } from "@/lib/engine/date";
import { CITY_TIERS, EVENT_TYPES, FOOD_PREFERENCES, type EventType } from "@/types/event";

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.")
  .refine((value) => parseCalendarDate(value) !== null, "Use a real calendar date.");

export const eventTypeSchema = z.enum(EVENT_TYPES);
export const cityTierSchema = z.enum(CITY_TIERS);
export const foodPreferenceSchema = z.enum(FOOD_PREFERENCES);

export const eventBriefSchema = z.object({
  eventType: eventTypeSchema,
  eventDate: calendarDateSchema,
  guests: z.number().int().min(0).max(5_000),
  budgetInr: z.number().int().min(0).max(100_000_000),
  city: z.string().trim().min(1).max(80),
  cityTier: cityTierSchema,
  notes: z.string().trim().max(1_200),
  foodPreference: foodPreferenceSchema,
  multiDay: z.boolean(),
});

export const eventFormSchema = eventBriefSchema.extend({
  guests: z.number().int().min(1, "Add at least one guest.").max(5_000),
  budgetInr: z.number().int().min(1, "Add a budget.").max(100_000_000),
  city: z.string().trim().min(2, "Add a city.").max(80),
});

export const extractRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(8, "Describe the event in a little more detail.")
    .max(1_200),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;
export type EventBriefInput = z.infer<typeof eventBriefSchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;

export function parseEventType(value: string): EventType | null {
  const parsed = eventTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
