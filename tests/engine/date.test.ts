import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  differenceInCalendarDays,
  formatCalendarDate,
  parseCalendarDate,
} from "@/lib/engine/date";

describe("calendar date helpers", () => {
  it("parses valid leap days and rejects impossible dates", () => {
    expect(parseCalendarDate("2024-02-29")).not.toBeNull();
    expect(parseCalendarDate("2026-02-29")).toBeNull();
    expect(parseCalendarDate("2026-13-01")).toBeNull();
    expect(parseCalendarDate("15-01-2026")).toBeNull();
  });

  it("adds days across month and year boundaries", () => {
    const date = parseCalendarDate("2026-12-31");
    expect(date).not.toBeNull();
    expect(formatCalendarDate(addCalendarDays(date!, 1))).toBe("2027-01-01");
  });

  it("counts whole calendar days in both directions", () => {
    const from = parseCalendarDate("2026-01-01")!;
    const to = parseCalendarDate("2026-02-01")!;
    expect(differenceInCalendarDays(from, to)).toBe(31);
    expect(differenceInCalendarDays(to, from)).toBe(-31);
  });
});
