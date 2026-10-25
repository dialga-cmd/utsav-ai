import { describe, expect, it } from "vitest";
import { createEmptyIntake, parseIntakeValues } from "@/lib/intake";

describe("intake", () => {
  it("parses valid values", () => {
    const v = createEmptyIntake();
    v.eventType = "wedding";
    v.eventDate = "2026-12-15";
    v.guests = "120";
    v.budgetInr = "450000";
    v.city = "Jaipur";
    const res = parseIntakeValues(v);
    expect(res.ok).toBe(true);
  });
});
