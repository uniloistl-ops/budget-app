/** Number of days left in the current month, counting today. */
export function daysLeftInMonth(today: Date = new Date()): number {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate() + 1;
}

/** "2026-08" style key for the month a date falls in. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** The current real-world month key — the one "days left" etc. is anchored to. */
export function currentMonthKey(): string {
  return monthKey(new Date());
}

function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

export function shiftMonthKey(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month + delta, 1);
  return monthKey(d);
}

/** "August 2026" from "2026-08". */
export function formatMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** First day of the given month, as an ISO date string — used as a sensible
 * default date when logging a transaction into a non-current month. */
export function firstDayOfMonth(key: string): string {
  const { year, month } = parseMonthKey(key);
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}
