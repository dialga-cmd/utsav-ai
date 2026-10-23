import type { CriticalEventField, EventBrief, EventType } from "@/types/event";
import type { ExtractedEvent, FollowUp, IdeaRefinement, VendorMessage } from "@/types/ai";
import type { BudgetBreakdown, IdeaSet } from "@/types/plan";
import { formatDisplayDate } from "@/lib/engine/date";
import { formatInr } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { buildBudget } from "@/lib/engine/budget";

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

interface IdeaDraft {
  theme: string;
  menu: string[];
  activities: string[];
  decor: string[];
  gifts: string[];
}

const CITY_FALLBACK = "your city";

function baseIdeas(eventType: EventType, brief: EventBrief): IdeaDraft {
  const city = brief.city || CITY_FALLBACK;
  const foodLine =
    brief.foodPreference === "veg"
      ? "A generous vegetarian spread with one live counter"
      : brief.foodPreference === "non_veg"
        ? "A balanced menu with one non-veg main and strong vegetarian options"
        : "A mixed menu with clearly labelled veg and non-veg counters";

  if (eventType === "wedding") {
    return {
      theme: `A warm ${city} wedding built around marigold, brass and family rituals.`,
      menu: [
        foodLine,
        "Seasonal chaat or tawa counter during sangeet",
        "Regional thali with dal, sabzi, rice, roti and salad",
        "Late-night chai, pakora and kulfi",
      ],
      activities: [
        "Haldi brunch with low-pressure family games",
        "Mehendi corner with a shared playlist",
        "45-minute sangeet run sheet with family performances",
        "Pheras followed by a relaxed reception dinner",
      ],
      decor: [
        "Marigold and jasmine garlands at the entrance",
        "Brass lamps and warm fairy lights",
        "A simple mandap using family textiles",
        "Reusable signage in the wedding palette",
      ],
      gifts: [
        "Small brass diyas or tea-light holders",
        "Handmade sweets in reusable boxes",
        "A spice or tea potli with a printed note",
        "Personal thank-you cards for close family",
      ],
    };
  }

  if (eventType === "birthday") {
    return {
      theme: `A playful ${city} birthday with one strong colour and a favourite interest.`,
      menu: [
        "Child-size snacks with one fruit and one protein option",
        "A clearly labelled eggless cake option",
        "Water, lemonade and a no-sugar drink",
        "A simple adult meal that can be served quickly",
      ],
      activities: [
        "Two short games with everyone getting a turn",
        "A craft or colouring table for quieter children",
        "A 20-minute entertainer set",
        "A family photo corner before cake",
      ],
      decor: [
        "One reusable backdrop in the birthday palette",
        "Balloon clusters kept away from young children",
        "Low table styling with safe, unbreakable props",
        "A clear cake and gift table",
      ],
      gifts: [
        "Useful stationery or craft kits",
        "A book matched to the age group",
        "Small plant or seed pencil",
        "Personalised name tags",
      ],
    };
  }

  return {
    theme: `A volunteer-led ${city} community day with clear zones and a shared meal.`,
    menu: [
      "Drinking-water refill points with clearly marked queues",
      "A simple meal with allergy labels",
      "One snack stall run by volunteers",
      "Separate waste bins beside every food point",
    ],
    activities: [
      "Opening welcome with a land acknowledgement and safety briefing",
      "Three short performances with a published run sheet",
      "All-ages games with seated options",
      "A quiet room and lost-child help desk",
    ],
    decor: [
      "Reusable signage for help desk, exits and first aid",
      "One stage backdrop with the event name",
      "Shade and seating for older guests",
      "Directional arrows mapped to the venue plan",
    ],
    gifts: [
      "Certificates for volunteers and performers",
      "Reusable cloth bags for participants",
      "Seed packets or small plants",
      "A community photo shared digitally",
    ],
  };
}

const REFINEMENT_OVERLAYS: Record<
  EventType,
  Record<IdeaRefinement, Partial<IdeaDraft>>
> = {
  wedding: {
    cheaper: {
      theme: "A home-led celebration that spends on food and photography first.",
      menu: ["Keep one signature live counter instead of three"],
      activities: ["Host haldi games at home and use family playlists"],
      decor: ["Reuse temple lamps, family textiles and seasonal flowers"],
      gifts: ["Pair a handwritten note with a small sweet box"],
    },
    more_traditional: {
      theme: "A classic family wedding with temple-inspired details.",
      menu: ["Add regional festival dishes and a satvik counter"],
      activities: ["Invite a folk singer for the haldi or mehendi"],
      decor: ["Use banana leaves, marigold and traditional kolam patterns"],
      gifts: ["Choose brass, bangles or regional crafts"],
    },
    more_modern: {
      theme: "A clean contemporary wedding with warm, minimal styling.",
      menu: ["Add a plated tasting course and mocktail bar"],
      activities: ["Plan a short photo-booth slot and a choreographed sangeet"],
      decor: ["Use a muted palette, clean lines and statement lighting"],
      gifts: ["Curate small design objects or gourmet hampers"],
    },
    kid_friendly: {
      theme: "A family-first wedding with a comfortable children's corner.",
      menu: ["Add mini portions, fruit cups and a familiar pasta option"],
      activities: ["Set up a supervised craft table and a quiet nap zone"],
      decor: ["Keep walkways clear and use soft, stable seating"],
      gifts: ["Give activity kits instead of small choking-hazard toys"],
    },
  },
  birthday: {
    cheaper: {
      theme: "A home party with one clear theme and a few strong details.",
      menu: ["Bake or order a simple sheet cake and serve snacks at home"],
      activities: ["Use household games, a playlist and a craft table"],
      decor: ["Reuse fabric, paper garlands and one focal backdrop"],
      gifts: ["Give a book or seed pencil with a handwritten tag"],
    },
    more_traditional: {
      theme: "A birthday with a small puja, flowers and family food.",
      menu: ["Add a family festival sweet and a traditional drink"],
      activities: ["Start with a short blessing and family photo"],
      decor: ["Use marigold, diyas and a simple rangoli"],
      gifts: ["Choose traditional sweets or a small brass keepsake"],
    },
    more_modern: {
      theme: "A modern colour-block party with a clean photo corner.",
      menu: ["Serve a grazing table and a custom cake"],
      activities: ["Book a science or art workshop and a photo booth"],
      decor: ["Use one bold colour, neon signage and geometric shapes"],
      gifts: ["Give a curated stationery or STEM kit"],
    },
    kid_friendly: {
      theme: "A playful party designed around the child's favourite interest.",
      menu: ["Keep food mild, easy to hold and allergy-labelled"],
      activities: ["Add a story session, dance break and quiet craft zone"],
      decor: ["Use floor cushions and child-height activity stations"],
      gifts: ["Pick age-safe games and avoid small loose parts"],
    },
  },
  community: {
    cheaper: {
      theme: "A reuse-first community gathering with volunteer-led stations.",
      menu: ["Bring one dish per family and centralise water refills"],
      activities: ["Use open-mic performances and borrowed equipment"],
      decor: ["Reuse last year's signage and decorate with cloth banners"],
      gifts: ["Give certificates and digital photos instead of objects"],
    },
    more_traditional: {
      theme: "A festival-style community day rooted in local customs.",
      menu: ["Add regional festival food and a shared prasad counter"],
      activities: ["Open with a folk performance and local artisan demo"],
      decor: ["Use rangoli, marigold and locally made signage"],
      gifts: ["Recognise elders and volunteers with traditional keepsakes"],
    },
    more_modern: {
      theme: "A clean, well-signposted community day with a modern programme.",
      menu: ["Use food trucks or pre-plated boxes to shorten queues"],
      activities: ["Add a maker corner, photo wall and digital RSVP"],
      decor: ["Use modular signage and a simple stage backdrop"],
      gifts: ["Share a digital community zine and reusable totes"],
    },
    kid_friendly: {
      theme: "A community day with safe, visible spaces for children.",
      menu: ["Label allergens and keep child portions mild"],
      activities: ["Add a supervised play zone and lost-child desk"],
      decor: ["Use child-height signs and clear pram routes"],
      gifts: ["Give activity books and seed kits"],
    },
  },
};

function mergeIdeas(base: IdeaDraft, overlay: Partial<IdeaDraft>): IdeaDraft {
  return {
    theme: overlay.theme ?? base.theme,
    menu: [...(overlay.menu ?? []), ...base.menu].slice(0, 6),
    activities: [...(overlay.activities ?? []), ...base.activities].slice(0, 6),
    decor: [...(overlay.decor ?? []), ...base.decor].slice(0, 6),
    gifts: [...(overlay.gifts ?? []), ...base.gifts].slice(0, 6),
  };
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
  const base = baseIdeas(brief.eventType, brief);
  const overlay = refinement ? REFINEMENT_OVERLAYS[brief.eventType][refinement] : {};
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
