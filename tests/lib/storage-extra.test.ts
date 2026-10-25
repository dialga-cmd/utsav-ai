/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { saveStoredPlan, loadStoredPlan, clearStoredPlan } from "@/lib/storage";
import { makePlan } from "@/tests/plan-factory";

describe("storage", () => {
  it("roundtrip", () => {
    localStorage.clear();
    const plan = makePlan();
    expect(saveStoredPlan(plan)).toBe(true);
    const res = loadStoredPlan();
    expect(res.status).toBe("ok");
    clearStoredPlan();
    expect(loadStoredPlan().status).toBe("empty");
  });
});
