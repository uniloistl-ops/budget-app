import type { BudgetStatus, CategoryId } from "../types";

/**
 * Single source of truth for category metadata.
 * Every place in the app that needs a category's color reads it from here
 * (via `getCategoryColor`) rather than hard-coding a hex value, so the
 * mapping stays consistent everywhere and stays trivial to make
 * user-editable later.
 */
export interface CategoryMeta {
  id: CategoryId;
  label: string;
  colorVar: string;
  description: string;
}

export const CATEGORY_ORDER: CategoryMeta[] = [
  { id: "rent", label: "Rent", colorVar: "--cat-rent", description: "Where you live" },
  { id: "groceries", label: "Groceries", colorVar: "--cat-groceries", description: "Food & household" },
  { id: "transport", label: "Transport", colorVar: "--cat-transport", description: "Getting around" },
  { id: "subscriptions", label: "Subscriptions", colorVar: "--cat-subscriptions", description: "Regular services" },
  { id: "savings", label: "Savings", colorVar: "--cat-savings", description: "Future you" },
  { id: "fun", label: "Fun money", colorVar: "--cat-fun", description: "No guilt spending" },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORY_ORDER.map((c) => [c.id, c])
) as Record<CategoryId, CategoryMeta>;

/** Resolve a category's color as a CSS var() reference, ready to use inline. */
export function getCategoryColor(id: CategoryId): string {
  return `var(${CATEGORY_MAP[id].colorVar})`;
}

/**
 * Literal hex values, mirroring the custom properties in theme.css exactly.
 * CSS-rendered elements should always prefer `getCategoryColor` (a var()
 * reference, so it repaints instantly on theme toggle); this map exists
 * only for the handful of places (SVG chart libraries) that need a
 * concrete color string rather than a CSS variable. Keep this in sync
 * with the `--cat-*` values in src/theme.css.
 */
export const CATEGORY_COLOR_HEX: Record<"light" | "dark", Record<CategoryId, string>> = {
  light: {
    rent: "#2a78d6",
    groceries: "#eb6834",
    transport: "#1baf7a",
    subscriptions: "#eda100",
    savings: "#e87ba4",
    fun: "#4a3aa7",
  },
  dark: {
    rent: "#5b9ce8",
    groceries: "#f08a5d",
    transport: "#3fc994",
    subscriptions: "#e5ac33",
    savings: "#ef9dbe",
    fun: "#9085e9",
  },
};

export function getCategoryHex(id: CategoryId, mode: "light" | "dark"): string {
  return CATEGORY_COLOR_HEX[mode][id];
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
