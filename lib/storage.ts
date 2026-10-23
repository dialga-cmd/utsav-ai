import { storedPlanSchema } from "@/lib/schemas/plan";
import type { PlanSnapshot } from "@/types/plan";

export const STORAGE_KEY = "utsav-ai.plan.v1";

export type LoadStoredPlanResult =
  { status: "empty" } | { status: "ok"; plan: PlanSnapshot } | { status: "invalid" };

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read and validate a saved plan; malformed data is removed, never rendered. */
export function loadStoredPlan(
  storage: Storage | null = defaultStorage(),
): LoadStoredPlanResult {
  if (!storage) return { status: "empty" };

  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: "empty" };
  }
  if (!raw) return { status: "empty" };

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = storedPlanSchema.safeParse(parsed);
    if (result.success) {
      return { status: "ok", plan: result.data.plan };
    }
  } catch {
    // Fall through to the reset path.
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing; the UI still works.
  }
  return { status: "invalid" };
}

/** Persist a plan; quota or privacy-mode failures are non-fatal. */
export function saveStoredPlan(
  plan: PlanSnapshot,
  storage: Storage | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1 as const, plan }));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredPlan(storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
