import type { EventBrief, EventType } from "@/types/event";
import type { IdeaRefinement } from "@/types/ai";

/**
 * Curated idea content used by the deterministic fallback planner.
 * Data only — no logic. Kept separate from lib/ai/fallback.ts so the
 * parser and the content can be edited independently.
 */

export interface IdeaDraft {
  theme: string;
  menu: string[];
  activities: string[];
  decor: string[];
  gifts: string[];
}

const CITY_FALLBACK = "your city";

function foodLineFor(brief: EventBrief): string {
  switch (brief.foodPreference) {
    case "veg":
      return "A generous vegetarian spread with one live counter";
    case "non_veg":
      return "A balanced menu with one non-veg main and strong vegetarian options";
    default:
      return "A mixed menu with clearly labelled veg and non-veg counters";
  }
}

function baseIdeas(eventType: EventType, brief: EventBrief): IdeaDraft {
  const city = brief.city || CITY_FALLBACK;

  if (eventType === "wedding") {
    return {
      theme: `A warm ${city} wedding built around marigold, brass and family rituals.`,
      menu: [
        foodLineFor(brief),
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

export const REFINEMENT_OVERLAYS: Record<
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

export function getBaseIdeas(eventType: EventType, brief: EventBrief): IdeaDraft {
  return baseIdeas(eventType, brief);
}

export function getRefinementOverlay(
  eventType: EventType,
  refinement: IdeaRefinement | null,
): Partial<IdeaDraft> {
  if (!refinement) return {};
  return REFINEMENT_OVERLAYS[eventType][refinement];
}

export function mergeIdeas(base: IdeaDraft, overlay: Partial<IdeaDraft>): IdeaDraft {
  return {
    theme: overlay.theme ?? base.theme,
    menu: [...(overlay.menu ?? []), ...base.menu].slice(0, 6),
    activities: [...(overlay.activities ?? []), ...base.activities].slice(0, 6),
    decor: [...(overlay.decor ?? []), ...base.decor].slice(0, 6),
    gifts: [...(overlay.gifts ?? []), ...base.gifts].slice(0, 6),
  };
}
