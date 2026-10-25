/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { extractEvent } from "@/lib/api/client";
import { createPlanSnapshot } from "@/lib/plan";
import { saveStoredPlan } from "@/lib/storage";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe("end-to-end style integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("free-text input -> extract -> plan snapshot -> persisted -> reloaded", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          eventType: "wedding",
          eventDate: "2026-12-15",
          guests: 120,
          budgetInr: 450000,
          city: "Jaipur",
          notes: "Wedding in Jaipur on 15 Dec 2026 for 120 guests with 4.5 lakh",
          followUps: [],
          source: "ai",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const extracted = await extractEvent(
      "Wedding in Jaipur on 15 Dec 2026 for 120 guests with 4.5 lakh",
    );
    expect(extracted.eventType).toBe("wedding");
    expect(extracted.source).toBe("ai");

    if (
      !extracted.eventType ||
      !extracted.eventDate ||
      extracted.guests == null ||
      extracted.budgetInr == null ||
      !extracted.city
    ) {
      throw new Error("extracted missing fields");
    }
    const result = createPlanSnapshot({
      eventType: extracted.eventType,
      eventDate: extracted.eventDate,
      guests: extracted.guests,
      budgetInr: extracted.budgetInr,
      city: extracted.city,
      cityTier: "tier2",
      foodPreference: "mixed",
      multiDay: false,
      notes: extracted.notes ?? "",
    } as unknown as Parameters<typeof createPlanSnapshot>[0]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unexpected");
    expect(result.plan.budget.categories.length).toBeGreaterThan(0);

    saveStoredPlan(result.plan);
    const stored = localStorage.getItem("utsav-ai.plan.v1");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.plan.brief.budgetInr).toBe(450000);
  });
});
