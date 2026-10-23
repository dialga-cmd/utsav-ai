import type { EventType } from "@/types/event";
import type { VendorEntry } from "@/types/plan";

interface VendorTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  checklist: string[];
}

const VENDOR_TEMPLATES: Record<EventType, readonly VendorTemplate[]> = {
  wedding: [
    {
      id: "wedding-venue",
      name: "Venue or tent house",
      category: "Venue",
      description: "The space, seating, power and weather cover.",
      checklist: [
        "Written quote with taxes, deposit and cancellation terms",
        "Capacity, seating plan, parking and guest accessibility",
        "Power backup, lighting limits and generator charges",
        "Setup, cleanup and damage charges listed separately",
        "Site visit at the same time of day as the event",
      ],
    },
    {
      id: "wedding-caterer",
      name: "Caterer",
      category: "Food",
      description: "Meals, live counters, service staff and water.",
      checklist: [
        "Per-plate rate for the final guest count, including GST",
        "Veg and non-veg counter plan with separate serving equipment",
        "Tasting date and dishes included in the final menu",
        "Service staff count, uniforms and clean drinking water",
        "Food safety licence and a written cancellation policy",
      ],
    },
    {
      id: "wedding-photography",
      name: "Photographer and videographer",
      category: "Media",
      description: "Photo, video, editing and delivery.",
      checklist: [
        "Exact coverage hours for every ceremony",
        "Team size, backup equipment and second shooter",
        "Number of edited photos, videos and delivery deadline",
        "Raw-file policy and album printing costs",
        "Sample work from a similar indoor and evening event",
      ],
    },
    {
      id: "wedding-decor",
      name: "Decorator or florist",
      category: "Decor",
      description: "Mandap, stage, entrance and flower styling.",
      checklist: [
        "Mood board with exact flower and fabric quantities",
        "Setup and removal windows approved by the venue",
        "Fresh versus reusable flower plan and weather backup",
        "Lighting, drape and power requirements",
        "Written substitution policy for seasonal flowers",
      ],
    },
    {
      id: "wedding-pandit",
      name: "Pandit or family priest",
      category: "Rituals",
      description: "Muhurat, pheras and puja samagri.",
      checklist: [
        "Availability for the exact muhurat and travel time",
        "Family customs, language and ritual duration",
        "Samagri list and whether it is included",
        "Dakshina, travel and assistant charges",
        "A shared run sheet with the family leads",
      ],
    },
    {
      id: "wedding-mehendi",
      name: "Mehendi artist",
      category: "Beauty",
      description: "Bridal and guest mehendi.",
      checklist: [
        "Number of artists and guests covered per hour",
        "Bridal design trial and henna quality",
        "Patch test policy and aftercare instructions",
        "Seating, lighting and hand-washing setup",
        "Travel and waiting charges in writing",
      ],
    },
    {
      id: "wedding-music",
      name: "Band, DJ or sound vendor",
      category: "Entertainment",
      description: "Sangeet, pheras and reception sound.",
      checklist: [
        "Equipment list, operator count and backup system",
        "Local sound-limit rules and required permissions",
        "Power load, cabling and generator needs",
        "Playlist approval and microphone count",
        "Overtime rate and curfew terms",
      ],
    },
    {
      id: "wedding-attire",
      name: "Attire and makeup team",
      category: "Looks",
      description: "Outfits, fittings, jewellery and makeup.",
      checklist: [
        "Trial date, products used and allergy check",
        "Fitting and alteration deadlines",
        "Jewellery hire deposit and insurance terms",
        "Artist availability until the last ceremony",
        "Travel, touch-up and assistant charges",
      ],
    },
    {
      id: "wedding-transport",
      name: "Transport provider",
      category: "Logistics",
      description: "Family cars and guest transfers.",
      checklist: [
        "Vehicle models, seating and luggage capacity",
        "Driver contacts, licences and night allowance",
        "Fuel, toll, parking and waiting-time terms",
        "Backup vehicle plan",
        "Pickup and drop run sheet shared in advance",
      ],
    },
  ],
  birthday: [
    {
      id: "birthday-venue",
      name: "Venue or party space",
      category: "Venue",
      description: "The room, timing and cleanup terms.",
      checklist: [
        "Hourly or package price with taxes and deposit",
        "Capacity for children and accompanying adults",
        "Parking, lift access and stroller accessibility",
        "Outside cake or food policy",
        "Cleanup, damage and overtime charges",
      ],
    },
    {
      id: "birthday-caterer",
      name: "Caterer or bakery",
      category: "Food",
      description: "Snacks, meals, cake and drinks.",
      checklist: [
        "Eggless and allergy-aware options",
        "Children's portion sizes and serving time",
        "Cake design approval and delivery slot",
        "Food handling and hygiene practices",
        "Written quote covering staff, plates and water",
      ],
    },
    {
      id: "birthday-entertainer",
      name: "Entertainer or activity host",
      category: "Activities",
      description: "Games, magic, craft or a workshop.",
      checklist: [
        "Age-appropriate programme and run time",
        "Experience with the expected group size",
        "Materials, prizes and cleanup included",
        "Background and safety references",
        "Weather backup for an outdoor plan",
      ],
    },
    {
      id: "birthday-decor",
      name: "Decorator",
      category: "Decor",
      description: "Backdrop, balloons and table styling.",
      checklist: [
        "Design preview with exact colours",
        "Setup and removal timing at the venue",
        "Latex-free options for allergies",
        "Secure fixing without wall damage",
        "Removal charge listed separately",
      ],
    },
    {
      id: "birthday-photography",
      name: "Photographer",
      category: "Media",
      description: "Event photos and a short highlights set.",
      checklist: [
        "Coverage window and number of edited photos",
        "Consent process for photographing children",
        "Delivery format and timeline",
        "Backup equipment and second shooter",
        "Price for prints or extra edits",
      ],
    },
  ],
  community: [
    {
      id: "community-venue",
      name: "Venue or ground coordinator",
      category: "Venue",
      description: "Access, power, water and cleanup.",
      checklist: [
        "Written permission and access times",
        "Power load, water points and toilet access",
        "Parking, accessibility and emergency vehicle route",
        "Cleanup and waste-disposal responsibility",
        "Weather contingency and shade plan",
      ],
    },
    {
      id: "community-caterer",
      name: "Community caterer",
      category: "Food",
      description: "Meals, water, serving lines and waste.",
      checklist: [
        "Per-plate quote with taxes and serving staff",
        "Food safety licence and drinking-water plan",
        "Allergy labelling and separate serving tools",
        "Waste segregation and bin count",
        "Realistic serving-line throughput",
      ],
    },
    {
      id: "community-sound",
      name: "Sound and power vendor",
      category: "Logistics",
      description: "PA system, microphones and backup power.",
      checklist: [
        "Equipment list, operator and backup microphone",
        "Power load, cabling and generator plan",
        "Local sound-limit compliance",
        "Weather protection for cables and speakers",
        "Setup, sound check and removal schedule",
      ],
    },
    {
      id: "community-decor",
      name: "Tent, decor and signage vendor",
      category: "Decor",
      description: "Shade, stage, directions and reusable signs.",
      checklist: [
        "Wind and rain safety for tents and banners",
        "Clear signage for help desk, exits and first aid",
        "Reusable or low-waste material options",
        "Setup and removal times with volunteers",
        "Fire-retardant certificates where required",
      ],
    },
    {
      id: "community-safety",
      name: "Safety and first-aid support",
      category: "Safety",
      description: "First aid, crowd flow and emergency response.",
      checklist: [
        "Qualified first-aider and stocked kit on site",
        "Named safety lead and emergency contact sheet",
        "Visible exits, fire points and assembly area",
        "Crowd capacity and entry/exit flow plan",
        "Lost-child desk and public-address protocol",
      ],
    },
    {
      id: "community-sanitation",
      name: "Sanitation and waste team",
      category: "Facilities",
      description: "Toilets, cleaning and waste handling.",
      checklist: [
        "Toilet count and cleaning frequency",
        "Separate wet, dry and food waste bins",
        "Collection partner and pickup time",
        "Spill kit and cleaning supplies",
        "Post-event site inspection checklist",
      ],
    },
  ],
};

/** Return generic vendor categories and verification checklists for an event type. */
export function buildVendorChecklist(eventType: EventType): VendorEntry[] {
  return VENDOR_TEMPLATES[eventType].map((vendor) => ({
    ...vendor,
    checklist: [...vendor.checklist],
    status: "not_contacted",
    quoteInr: null,
  }));
}
