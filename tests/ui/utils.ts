/**
 * Shared helpers for component tests that run in a jsdom environment.
 */
import { makePlan } from "../plan-factory";
import type { PlanSnapshot } from "@/types/plan";

/** Create a valid, fully-populated plan for rendering tests. */
export function testPlan(overrides: Partial<PlanSnapshot> = {}): PlanSnapshot {
  return makePlan(overrides);
}
