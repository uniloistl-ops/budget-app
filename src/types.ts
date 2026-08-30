export type CategoryId =
  | "rent"
  | "groceries"
  | "transport"
  | "subscriptions"
  | "savings"
  | "fun";

export interface Category {
  id: CategoryId;
  label: string;
  /** CSS custom property name holding this category's color, e.g. "--cat-rent" */
  colorVar: string;
  /** short, warm description used in empty states / tooltips */
  description: string;
  limit: number;
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
