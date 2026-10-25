import { describe, expect, it } from "vitest";
import { formatInr } from "@/lib/format";

describe("format", () => {
  it("formats INR", () => {
    expect(formatInr(450000)).toContain("₹");
  });
});
