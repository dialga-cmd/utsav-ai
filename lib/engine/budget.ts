import type { EventBrief } from "@/types/event";
import type { BudgetBreakdown, BudgetCategory, BudgetTier } from "@/types/plan";

interface BudgetCategoryTemplate {
  id: string;
  label: string;
  baseWeight: number;
  guidance: string;
}

const TEMPLATES: Record<EventBrief["eventType"], readonly BudgetCategoryTemplate[]> = {
  wedding: [
    {
      id: "venue",
      label: "Venue & tent",
      baseWeight: 22,
      guidance: "Hall or tent house; confirm chairs, power, parking and deposit.",
    },
    {
      id: "catering",
      label: "Food & catering",
      baseWeight: 28,
      guidance: "Per-plate food, service staff and water; agree a tasting and extras.",
    },
    {
      id: "decor",
      label: "Decor & flowers",
      baseWeight: 10,
      guidance: "Mandap, stage and entrance flowers; confirm setup and removal.",
    },
    {
      id: "attire",
      label: "Attire & beauty",
      baseWeight: 8,
      guidance: "Outfits, jewellery hire, makeup and fitting buffer.",
    },
    {
      id: "photography",
      label: "Photo & video",
      baseWeight: 8,
      guidance: "Coverage hours, edited album, raw files and delivery date.",
    },
    {
      id: "music",
      label: "Music & entertainment",
      baseWeight: 5,
      guidance: "DJ, band or sound system; check licences and power needs.",
    },
    {
      id: "invitations",
      label: "Invitations",
      baseWeight: 3,
      guidance: "Printed cards or digital invites, courier and call follow-ups.",
    },
    {
      id: "rituals",
      label: "Rituals & puja",
      baseWeight: 6,
      guidance: "Pandit, samagri, haldi and mehendi essentials.",
    },
    {
      id: "transport",
      label: "Transport",
      baseWeight: 3,
      guidance: "Family cars, guest transfers and driver waiting time.",
    },
    {
      id: "contingency",
      label: "Contingency",
      baseWeight: 7,
      guidance: "Keep a cash buffer for last-minute additions or price changes.",
    },
  ],
  birthday: [
    {
      id: "venue",
      label: "Venue",
      baseWeight: 18,
      guidance: "Party hall, restaurant corner or home setup; confirm timing limits.",
    },
    {
      id: "catering",
      label: "Food & catering",
      baseWeight: 25,
      guidance:
        "Snacks, mains and drinks; confirm children's portions and serving staff.",
    },
    {
      id: "cake",
      label: "Cake",
      baseWeight: 7,
      guidance: "Design, flavour, eggless option and delivery time.",
    },
    {
      id: "decor",
      label: "Decor",
      baseWeight: 12,
      guidance: "Backdrop, balloons and table styling; confirm removal charges.",
    },
    {
      id: "activities",
      label: "Games & activities",
      baseWeight: 11,
      guidance: "Host, craft kits, prizes or a magic show for the age group.",
    },
    {
      id: "gifts",
      label: "Return gifts",
      baseWeight: 7,
      guidance: "Age-appropriate, useful and safely packed for every child.",
    },
    {
      id: "photography",
      label: "Photos",
      baseWeight: 5,
      guidance: "Two-hour coverage, edited images and delivery timeline.",
    },
    {
      id: "supplies",
      label: "Supplies",
      baseWeight: 7,
      guidance: "Plates, candles, party favours and a simple first-aid kit.",
    },
    {
      id: "contingency",
      label: "Contingency",
      baseWeight: 8,
      guidance: "A small buffer for extra guests or a last-minute cake change.",
    },
  ],
  community: [
    {
      id: "venue",
      label: "Venue & setup",
      baseWeight: 14,
      guidance: "Ground, hall or school space; confirm access, power and cleanup.",
    },
    {
      id: "catering",
      label: "Food & stalls",
      baseWeight: 23,
      guidance: "Water, snacks and meals; plan serving lines and waste separation.",
    },
    {
      id: "permits",
      label: "Permissions",
      baseWeight: 5,
      guidance: "Society, municipal or school approvals; keep copies on site.",
    },
    {
      id: "decor",
      label: "Decor & signage",
      baseWeight: 7,
      guidance: "Reusable signage, stage styling and clear wayfinding.",
    },
    {
      id: "activities",
      label: "Programme",
      baseWeight: 14,
      guidance: "Games, performances, prizes and an MC run sheet.",
    },
    {
      id: "sound",
      label: "Sound & power",
      baseWeight: 7,
      guidance: "PA system, backup power and a sound-level plan.",
    },
    {
      id: "volunteers",
      label: "Volunteers",
      baseWeight: 4,
      guidance: "Volunteer meals, badges, briefing and a central help desk.",
    },
    {
      id: "safety",
      label: "Safety & first aid",
      baseWeight: 8,
      guidance: "First-aid kit, crowd flow, fire safety and a named safety lead.",
    },
    {
      id: "promotion",
      label: "Promotion",
      baseWeight: 10,
      guidance: "Posters, WhatsApp notices and local outreach.",
    },
    {
      id: "contingency",
      label: "Contingency",
      baseWeight: 8,
      guidance: "Buffer for weather, extra volunteers or a replacement vendor.",
    },
  ],
};

const ECONOMY_MAX_PER_GUEST_INR = 1_200;
const PREMIUM_MIN_PER_GUEST_INR = 3_500;
const SMALL_GUEST_COUNT = 50;
const LARGE_GUEST_COUNT = 200;
const ZERO_GUEST_ECONOMY_MAX_INR = 60_000;
const ZERO_GUEST_PREMIUM_MIN_INR = 250_000;
const MAX_BUDGET_INR = 100_000_000;

/** Classify a budget using spend per guest, with a total-based fallback for zero guests. */
export function getBudgetTier(budgetInr: number, guests: number): BudgetTier {
  if (guests <= 0) {
    if (budgetInr < ZERO_GUEST_ECONOMY_MAX_INR) return "economy";
    if (budgetInr >= ZERO_GUEST_PREMIUM_MIN_INR) return "premium";
    return "standard";
  }

  const perGuest = budgetInr / guests;
  if (perGuest < ECONOMY_MAX_PER_GUEST_INR) return "economy";
  if (perGuest >= PREMIUM_MIN_PER_GUEST_INR) return "premium";
  return "standard";
}

/**
 * Allocate an integer total across fractional weights using the largest-remainder
 * method. The returned amounts always add up to exactly `total`.
 */
export function allocateAmounts(total: number, weights: readonly number[]): number[] {
  const safeTotal = Math.max(0, Math.trunc(total));
  if (weights.length === 0) return [];
  if (safeTotal === 0) return weights.map(() => 0);

  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const weightSum = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum === 0) {
    const base = Math.floor(safeTotal / weights.length);
    return weights.map((_, index) =>
      index < safeTotal % weights.length ? base + 1 : base,
    );
  }

  const exact = safeWeights.map((weight) => (safeTotal * weight) / weightSum);
  const amounts = exact.map((amount) => Math.floor(amount));
  let remainder = safeTotal - amounts.reduce((sum, amount) => sum + amount, 0);

  const priority = exact
    .map((amount, index) => ({ index, fraction: amount - Math.floor(amount) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let cursor = 0; remainder > 0; cursor += 1) {
    amounts[priority[cursor % priority.length].index] += 1;
    remainder -= 1;
  }

  return amounts;
}

function contextMultiplier(
  categoryId: string,
  brief: EventBrief,
  tier: BudgetTier,
): number {
  let multiplier = 1;

  if (brief.cityTier === "metro") {
    if (categoryId === "venue") multiplier *= 1.18;
    if (categoryId === "decor") multiplier *= 1.1;
    if (categoryId === "photography") multiplier *= 1.08;
    if (categoryId === "catering") multiplier *= 1.1;
    if (categoryId === "transport") multiplier *= 1.08;
  } else if (brief.cityTier === "tier3") {
    if (categoryId === "venue") multiplier *= 0.84;
    if (categoryId === "decor") multiplier *= 0.9;
    if (categoryId === "photography") multiplier *= 0.9;
    if (categoryId === "catering") multiplier *= 0.84;
    if (categoryId === "transport") multiplier *= 0.9;
  }

  if (tier === "economy") {
    if (categoryId === "decor") multiplier *= 0.72;
    if (categoryId === "photography") multiplier *= 0.78;
    if (categoryId === "gifts") multiplier *= 0.8;
    if (categoryId === "activities") multiplier *= 0.85;
    if (categoryId === "contingency") multiplier *= 1.25;
  } else if (tier === "premium") {
    if (categoryId === "decor") multiplier *= 1.32;
    if (categoryId === "photography") multiplier *= 1.25;
    if (categoryId === "gifts") multiplier *= 1.15;
    if (categoryId === "catering") multiplier *= 1.08;
    if (categoryId === "contingency") multiplier *= 0.8;
  }

  if (brief.guests >= LARGE_GUEST_COUNT) {
    if (categoryId === "catering") multiplier *= 1.18;
    if (categoryId === "venue") multiplier *= 1.1;
    if (categoryId === "supplies") multiplier *= 1.1;
    if (categoryId === "invitations") multiplier *= 1.15;
    if (categoryId === "decor") multiplier *= 0.95;
  } else if (brief.guests > 0 && brief.guests <= SMALL_GUEST_COUNT) {
    if (categoryId === "catering") multiplier *= 0.9;
    if (categoryId === "venue") multiplier *= 0.85;
    if (categoryId === "invitations") multiplier *= 0.8;
    if (categoryId === "contingency") multiplier *= 1.1;
  }

  if (brief.multiDay) {
    if (categoryId === "catering") multiplier *= 1.25;
    if (categoryId === "venue") multiplier *= 1.2;
    if (categoryId === "decor") multiplier *= 1.15;
    if (categoryId === "rituals") multiplier *= 1.4;
    if (categoryId === "attire") multiplier *= 1.1;
  }

  if (categoryId === "catering") {
    if (brief.foodPreference === "veg") multiplier *= 0.94;
    if (brief.foodPreference === "non_veg") multiplier *= 1.08;
  }

  return multiplier;
}

/**
 * Build a deterministic INR budget. The whole-rupee category amounts always sum
 * to `brief.budgetInr`, including tiny and very large budgets.
 */
export function buildBudget(brief: EventBrief): BudgetBreakdown {
  const totalInr = Math.min(MAX_BUDGET_INR, Math.max(0, Math.trunc(brief.budgetInr)));
  const tier = getBudgetTier(totalInr, brief.guests);
  const templates = TEMPLATES[brief.eventType];

  const weights = templates.map(
    (template) => template.baseWeight * contextMultiplier(template.id, brief, tier),
  );
  const amounts = allocateAmounts(totalInr, weights);

  const categories: BudgetCategory[] = templates.map((template, index) => ({
    id: template.id,
    label: template.label,
    plannedInr: amounts[index],
    actualInr: null,
    sharePct: totalInr > 0 ? Math.round((amounts[index] / totalInr) * 1_000) / 10 : 0,
    guidance: template.guidance,
  }));

  return {
    totalInr,
    perGuestInr: brief.guests > 0 ? Math.round(totalInr / brief.guests) : 0,
    tier,
    categories,
  };
}
