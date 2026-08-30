import type { BudgetStatus } from "../types";

/**
 * Categories are user-managed (added/renamed/removed from the Categories
 * page), so there's no fixed list here anymore — the default starter set
 * lives in BudgetDataContext instead. What stays here: color assignment
 * for newly-added categories, and the status-color helpers shared by
 * anything with a spent/limit ratio (categories, goals, debts).
 */

/** Resolve a category's color as a CSS var() reference, ready to use inline. */
export function getCategoryColor(colorVar: string): string {
  return `var(${colorVar})`;
}

/**
 * Literal hex values, mirroring the custom properties in theme.css exactly.
 * CSS-rendered elements should always prefer `getCategoryColor` (a var()
 * reference, so it repaints instantly on theme toggle); this map exists
 * only for the handful of places (SVG/canvas chart drawing) that need a
 * concrete color string. Keep this in sync with the `--cat-*` values in
 * src/theme.css.
 */
const COLOR_VAR_HEX: Record<"light" | "dark", Record<string, string>> = {
  light: {
    "--cat-rent": "#2a78d6",
    "--cat-groceries": "#eb6834",
    "--cat-transport": "#1baf7a",
    "--cat-subscriptions": "#eda100",
    "--cat-savings": "#e87ba4",
    "--cat-fun": "#4a3aa7",
    "--cat-extra-1": "#008300",
    "--cat-extra-2": "#e34948",
  },
  dark: {
    "--cat-rent": "#5b9ce8",
    "--cat-groceries": "#f08a5d",
    "--cat-transport": "#3fc994",
    "--cat-subscriptions": "#e5ac33",
    "--cat-savings": "#ef9dbe",
    "--cat-fun": "#9085e9",
    "--cat-extra-1": "#008300",
    "--cat-extra-2": "#e57373",
  },
};

export function getCategoryHex(colorVar: string, mode: "light" | "dark"): string {
  return COLOR_VAR_HEX[mode][colorVar] ?? (mode === "light" ? "#96938a" : "#918e84");
}

/** The full color-assignment pool, in order. The starter categories claim
 * the first six; a category you add yourself gets the next free slot,
 * cycling back around if you've added more than eight. */
export const COLOR_VAR_POOL = [
  "--cat-rent",
  "--cat-groceries",
  "--cat-transport",
  "--cat-subscriptions",
  "--cat-savings",
  "--cat-fun",
  "--cat-extra-1",
  "--cat-extra-2",
];

export function nextColorVar(existingCategoryCount: number): string {
  return COLOR_VAR_POOL[existingCategoryCount % COLOR_VAR_POOL.length];
}

/**
 * Traffic-light status from how close spending is to the limit.
 * Kept as one function so the green -> yellow -> red thresholds are
 * defined exactly once.
 */
export function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return "good";
  const ratio = spent / limit;
  if (ratio < 0.7) return "good";
  if (ratio < 0.9) return "warning";
  if (ratio < 1.0) return "serious";
  return "critical";
}

export function getStatusColorVar(status: BudgetStatus): string {
  return `var(--status-${status})`;
}

export function getStatusBgVar(status: BudgetStatus): string {
  return `var(--status-${status}-bg)`;
}
