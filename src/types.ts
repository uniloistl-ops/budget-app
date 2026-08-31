/** Categories are user-managed now, so this is just a string id
 * (e.g. "rent" for the presets, or a generated id for a custom one). */
export type CategoryId = string;

export type CategoryType = "fixed" | "variable";

export interface Category {
  id: CategoryId;
  label: string;
  /** CSS custom property name holding this category's color, e.g. "--cat-rent" */
  colorVar: string;
  /** short, warm description used in empty states / tooltips */
  description: string;
  limit: number;
  /** "fixed" = same amount every month (rent, insurance, subscriptions);
   * "variable" = changes month to month (groceries, fun money). */
  type: CategoryType;
}

/** A category plus how much has actually been spent this month — derived
 * from the transaction list, never stored directly. */
export interface CategoryWithSpent extends Category {
  spent: number;
}

export interface Transaction {
  id: string;
  categoryId: CategoryId;
  description: string;
  amount: number;
  date: string; // ISO date
}

export type BudgetStatus = "good" | "warning" | "serious" | "critical";

export interface Goal {
  id: string;
  label: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
}

export interface Debt {
  id: string;
  label: string;
  /** The original amount owed, when the debt started. */
  totalAmount: number;
  /** What's still owed right now — you update this as you pay it down. */
  remainingAmount: number;
  /** Optional — what you pay toward it each month, just for reference. */
  monthlyPayment?: number;
}

/** When your salary/main income actually arrives — so the Overview can
 * count down to it instead of to the calendar month-end. `null` means
 * not configured yet, and everything falls back to calendar months. */
export type PaydaySettings = { mode: "fixed"; dayOfMonth: number } | { mode: "lastWeekday" };

/** One source of income for a given month — your paycheck, a side gig,
 * a gift, a refund, whatever. A month's total income is the sum of these. */
export interface IncomeSource {
  id: string;
  label: string;
  amount: number;
}
