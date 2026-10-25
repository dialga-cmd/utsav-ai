import { buildBudget } from "@/lib/engine/budget";
import { buildTimeline } from "@/lib/engine/timeline";
import { buildVendorChecklist } from "@/lib/engine/vendors";
import { buildFallbackIdeas } from "@/lib/ai/fallback";
import { makeBrief } from "./factories";
import type { PlanSnapshot } from "@/types/plan";

const NOW = new Date("2026-01-15T00:00:00.000Z");

export function makePlan(overrides: Partial<PlanSnapshot> = {}): PlanSnapshot {
  const brief = makeBrief();
  const timelineResult = buildTimeline(brief, { now: NOW });
  if (!timelineResult.ok) throw new Error("Failed to build timeline");

  return {
    brief,
    budget: buildBudget(brief),
    timeline: timelineResult.plan,
    vendors: buildVendorChecklist("wedding"),
    ideas: buildFallbackIdeas(brief, null),
    ...overrides,
  };
}
