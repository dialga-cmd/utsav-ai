import { describe, expect, it } from "vitest";
import { buildVendorChecklist } from "@/lib/engine/vendors";

describe("buildVendorChecklist", () => {
  it("returns generic vendor types without invented business contacts", () => {
    for (const eventType of ["wedding", "birthday", "community"] as const) {
      const vendors = buildVendorChecklist(eventType);
      expect(vendors.length).toBeGreaterThanOrEqual(5);

      const serialized = JSON.stringify(vendors);
      expect(serialized).not.toMatch(/\d{10}/);
      expect(serialized).not.toMatch(/\+91/);
      expect(serialized).not.toMatch(/@[a-z0-9.-]+\./i);
    }
  });

  it("includes cultural and safety-specific vendor checks", () => {
    const wedding = buildVendorChecklist("wedding");
    expect(wedding.some((vendor) => vendor.name.includes("Pandit"))).toBe(true);
    expect(wedding.some((vendor) => vendor.name.includes("Mehendi"))).toBe(true);

    const community = buildVendorChecklist("community");
    expect(
      community.flatMap((vendor) => vendor.checklist).join(" ").toLowerCase(),
    ).toContain("emergency");
    expect(community.some((vendor) => vendor.category === "Safety")).toBe(true);
  });

  it("starts every vendor uncontacted with no quote", () => {
    const vendors = buildVendorChecklist("birthday");
    expect(
      vendors.every(
        (vendor) => vendor.status === "not_contacted" && vendor.quoteInr === null,
      ),
    ).toBe(true);
    expect(vendors.every((vendor) => vendor.checklist.length >= 4)).toBe(true);
  });
});
