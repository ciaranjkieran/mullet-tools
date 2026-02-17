import { format, getYear } from "date-fns";

/**
 * Formats a date with the given pattern, appending the year
 * only when the date falls outside the current year.
 *
 * e.g. formatDateLabel(date, "eee, MMM d") => "Mon, Jan 5" or "Mon, Jan 5, 2025"
 */
export function formatDateLabel(date: Date, pattern: string): string {
  const label = format(date, pattern);
  return getYear(date) !== getYear(new Date()) ? `${label}, ${getYear(date)}` : label;
}
