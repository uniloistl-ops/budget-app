import type { PaydaySettings } from "../types";

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

// ---------------------------------------------------------------------------
// Payday
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** The last weekday (Mon–Fri) of the given month — the common real-world
 * "last working day" pattern. Doesn't know about public holidays, only
 * weekends; that's a deliberate, honest limitation, not a bug. */
function lastWeekdayOfMonth(year: number, month: number): Date {
  const d = new Date(year, month, daysInMonth(year, month));
  while (isWeekend(d)) d.setDate(d.getDate() - 1);
  return d;
}

function fixedDayOfMonth(year: number, month: number, day: number): Date {
  return new Date(year, month, Math.min(day, daysInMonth(year, month)));
}

function paydayInMonth(payday: PaydaySettings, year: number, month: number): Date {
  return payday.mode === "fixed" ? fixedDayOfMonth(year, month, payday.dayOfMonth) : lastWeekdayOfMonth(year, month);
}

/** The next payday on or after `today`, given the configured pattern. */
export function getNextPayday(payday: PaydaySettings, today: Date = new Date()): Date {
  const base = startOfDay(today);
  let candidate = paydayInMonth(payday, base.getFullYear(), base.getMonth());
  if (candidate < base) {
    const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    candidate = paydayInMonth(payday, nextMonth.getFullYear(), nextMonth.getMonth());
  }
  return candidate;
}

/** Whole days between today and a target date (0 if it's today). */
export function daysUntil(target: Date, today: Date = new Date()): number {
  const ms = startOfDay(target).getTime() - startOfDay(today).getTime();
  return Math.round(ms / 86_400_000);
}
