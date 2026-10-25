const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MS_PER_DAY = 86_400_000;

/**
 * Parse a YYYY-MM-DD string as UTC midnight, rejecting impossible dates.
 * UTC keeps date-only arithmetic stable across server and browser time zones.
 */
export function parseCalendarDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Full calendar days from `from` to `to`; negative when `to` is earlier. */
export function differenceInCalendarDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Midnight UTC for the supplied instant, which keeps comparisons deterministic. */
export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Human-readable date without relying on the runtime's locale database. */
export function formatDisplayDate(value: string): string {
  const date = parseCalendarDate(value);
  if (!date) return value;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
