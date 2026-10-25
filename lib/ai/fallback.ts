import type { CriticalEventField, EventBrief, EventType } from "@/types/event";
import type { ExtractedEvent, FollowUp, IdeaRefinement, VendorMessage } from "@/types/ai";
import type { BudgetBreakdown, IdeaSet } from "@/types/plan";
import { formatDisplayDate } from "@/lib/engine/date";
import { formatInr } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { buildBudget } from "@/lib/engine/budget";
import { getBaseIdeas, getRefinementOverlay, mergeIdeas } from "@/lib/ai/fallback-ideas";

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const FOLLOW_UP_QUESTIONS: Record<CriticalEventField, string> = {
  eventType: "What kind of event is it: wedding, birthday, or community event?",
  eventDate: "What date is the event?",
  guests: "Roughly how many guests are you planning for?",
  budgetInr: "What is your total budget in rupees?",
};

const MAX_FOLLOW_UPS = 2;

function toIsoDate(year: number, monthIndex: number, day: number): string | null {
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function extractDate(text: string, today: Date): string | null {
  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) {
    const candidate = toIsoDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (candidate) return candidate;
  }

  const numeric = /\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/.exec(text);
  if (numeric) {
    const candidate = toIsoDate(
      Number(numeric[3]),
      Number(numeric[2]) - 1,
      Number(numeric[1]),
    );
    if (candidate) return candidate;
  }

  const dayMonthYear =
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(20\d{2})\b/i.exec(
      text,
    );
  if (dayMonthYear) {
    const month = MONTHS[dayMonthYear[2].toLowerCase().replace(".", "")];
    const candidate = toIsoDate(Number(dayMonthYear[3]), month, Number(dayMonthYear[1]));
    if (candidate) return candidate;
  }

  const monthDayYear =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i.exec(
      text,
    );
  if (monthDayYear) {
    const month = MONTHS[monthDayYear[1].toLowerCase().replace(".", "")];
    const candidate = toIsoDate(Number(monthDayYear[3]), month, Number(monthDayYear[2]));
    if (candidate) return candidate;
  }

  const dayMonth =
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.exec(
      text,
    );
  if (dayMonth) {
    const month = MONTHS[dayMonth[2].toLowerCase()];
    const currentYear = today.getUTCFullYear();
    const thisYear = toIsoDate(currentYear, month, Number(dayMonth[1]));
    if (thisYear && thisYear >= today.toISOString().slice(0, 10)) return thisYear;
    return toIsoDate(currentYear + 1, month, Number(dayMonth[1]));
  }

  return null;
}

function extractGuests(text: string): number | null {
  const match = /(\d{1,4})\s*(?:guests?|people|pax|attendees|members)\b/i.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return value > 0 && value <= 5_000 ? value : null;
}

function extractBudget(text: string): number | null {
  const unitMatch =
    /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?|l|crores?|cr)\b/i.exec(text);
  if (unitMatch) {
    const amount = Number(unitMatch[1].replace(/,/g, ""));
    const unit = unitMatch[2].toLowerCase();
    const multiplier = unit.startsWith("cr") ? 10_000_000 : 100_000;
    const value = Math.round(amount * multiplier);
    return value > 0 && value <= 100_000_000 ? value : null;
  }

  const currencyMatch = /(?:₹|rs\.?|inr)\s*([\d,]{2,})/i.exec(text);
  const plainMatch = /\b(\d{1,3}(?:,\d{2,3}){1,}|\d{5,})\b/.exec(text);
  const raw = currencyMatch?.[1] ?? plainMatch?.[1];
  if (!raw) return null;

  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 && value <= 100_000_000 ? value : null;
}

function extractCity(text: string): string | null {
  const match = /\b(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})\b/.exec(text);
  return match?.[1]?.trim() ?? null;
}

function inferEventType(text: string): EventType | null {
  const normalized = text.toLowerCase();
  if (
    /\b(wedding|shaadi|shadi|vivah|sangeet|mehendi|haldi|pheras?|bride|groom)\b/.test(
      normalized,
    )
  ) {
    return "wedding";
  }
  if (/\b(birthday|bday|b'day|turning\s+\d{1,2})\b/.test(normalized)) {
    return "birthday";
  }
  if (
    /\b(community|rwa|society|school fair|festival|mela|neighbourhood|neighborhood|annual day)\b/.test(
      normalized,
    )
  ) {
    return "community";
  }
  return null;
}

/** Deterministic fallback parser used when the model is unavailable. */
export function extractEventFallback(text: string, now = new Date()): ExtractedEvent {
  const eventType = inferEventType(text);
  const eventDate = extractDate(text, now);
  const guests = extractGuests(text);
  const budgetInr = extractBudget(text);
  const city = extractCity(text);

  const base = {
    eventType,
    eventDate,
    guests,
    budgetInr,
    city: city && city.length <= 80 ? city : null,
    notes: text.trim().slice(0, 1_200),
    source: "fallback" as const,
  };

  return { ...base, followUps: buildFollowUps(base) };
}

/** Ask for at most two missing critical fields; the form covers the rest. */
export function buildFollowUps(
  extraction: Pick<ExtractedEvent, "eventType" | "eventDate" | "guests" | "budgetInr">,
): FollowUp[] {
  const missing: CriticalEventField[] = [];
  if (!extraction.eventType) missing.push("eventType");
  if (!extraction.eventDate) missing.push("eventDate");
  if (extraction.guests === null) missing.push("guests");
  if (extraction.budgetInr === null) missing.push("budgetInr");

  return missing.slice(0, MAX_FOLLOW_UPS).map((field) => ({
    field,
    question: FOLLOW_UP_QUESTIONS[field],
  }));
}

function fallbackSavings(brief: EventBrief, budget: BudgetBreakdown): string[] {
  const sorted = [...budget.categories].sort((a, b) => b.plannedInr - a.plannedInr);
  const largest = sorted[0];
  const catering = budget.categories.find((category) => category.id === "catering");
  const contingency = budget.categories.find((category) => category.id === "contingency");

  const tips: string[] = [];
  if (largest) {
    tips.push(
      `Your biggest line is ${largest.label.toLowerCase()} at ${formatInr(
        largest.plannedInr,
      )}. Get two itemised quotes before approving extras.`,
    );
  }
  if (catering && brief.guests >= 10) {
    const tenGuestSaving = Math.round(
      (catering.plannedInr / brief.guests) * Math.min(10, brief.guests),
    );
    tips.push(
      `Trimming 10 guests could free about ${formatInr(
        tenGuestSaving,
      )} from the current catering allocation.`,
    );
  }
  if (contingency) {
    tips.push(
      `Hold the ${formatInr(
        contingency.plannedInr,
      )} contingency until the final week; use it for one real gap, not upgrades.`,
    );
  }
  tips.push(
    "Ask for package pricing across three vendor types and compare the total including taxes and setup.",
  );

  return tips.slice(0, 5);
}

/** Curated ideas used when the model is not configured or fails. */
export function buildFallbackIdeas(
  brief: EventBrief,
  refinement: IdeaRefinement | null,
  budget = buildBudget(brief),
): IdeaSet {
  const base = getBaseIdeas(brief.eventType, brief);
  const overlay = getRefinementOverlay(brief.eventType, refinement);
  const merged = mergeIdeas(base, overlay);

  return {
    ...merged,
    savings: fallbackSavings(brief, budget),
    source: "fallback",
  };
}

/** Plain-text vendor enquiry used when the model is unavailable. */
export function buildFallbackVendorMessage(
  brief: EventBrief,
  vendorName: string,
  notes = "",
): VendorMessage {
  const eventLabel = EVENT_TYPE_LABELS[brief.eventType];
  const dateLabel = formatDisplayDate(brief.eventDate);
  const notesLine = notes ? `\nA few specifics: ${notes}` : "";

  return {
    subject: `${vendorName} enquiry for ${eventLabel.toLowerCase()} on ${dateLabel}`,
    message: `Namaste,

We are planning a ${eventLabel.toLowerCase()} in ${brief.city} for about ${
      brief.guests
    } guests on ${dateLabel}, with a working budget of ${formatInr(
      brief.budgetInr,
    )}.${notesLine}

Could you please share:
1. Availability for our date
2. An itemised written quote including taxes, setup and service
3. Advance, cancellation and rescheduling terms
4. What is included versus charged as an extra
5. The best time for a short call or site visit

Please reply with a written quote so we can compare options carefully.

Thank you,
[Your name]`,
    source: "fallback",
  };
}
