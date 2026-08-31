import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { nextColorVar } from "../config/categories";
import { usePersistentState } from "../lib/usePersistentState";
import { currentMonthKey, shiftMonthKey } from "../lib/dates";
import type { Category, CategoryId, CategoryType, CategoryWithSpent, Debt, Goal, Transaction } from "../types";

// A starter set so the app isn't empty on first run — rename, delete, or
// add to these freely from the Categories page.
const DEFAULT_CATEGORIES: Category[] = [
  { id: "rent", label: "Rent", colorVar: "--cat-rent", description: "Where you live", limit: 900, type: "fixed" },
  { id: "groceries", label: "Groceries", colorVar: "--cat-groceries", description: "Food & household", limit: 350, type: "variable" },
  { id: "transport", label: "Transport", colorVar: "--cat-transport", description: "Getting around", limit: 90, type: "variable" },
  { id: "subscriptions", label: "Subscriptions", colorVar: "--cat-subscriptions", description: "Regular services", limit: 60, type: "fixed" },
  { id: "savings", label: "Savings", colorVar: "--cat-savings", description: "Future you", limit: 300, type: "fixed" },
  { id: "fun", label: "Fun money", colorVar: "--cat-fun", description: "No guilt spending", limit: 150, type: "variable" },
];

// Seeded with a few example transactions so the app isn't empty on first
// run — delete them and add your own whenever you like.
const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: "t1", categoryId: "groceries", description: "Migros", amount: 42.3, date: "2026-08-29" },
  { id: "t2", categoryId: "fun", description: "Cinema", amount: 18, date: "2026-08-28" },
  { id: "t3", categoryId: "transport", description: "SBB day pass", amount: 12.5, date: "2026-08-27" },
  { id: "t4", categoryId: "subscriptions", description: "Spotify", amount: 12.95, date: "2026-08-25" },
  { id: "t5", categoryId: "groceries", description: "Coop", amount: 31.1, date: "2026-08-24" },
  { id: "t6", categoryId: "fun", description: "Board game", amount: 24, date: "2026-08-22" },
  { id: "t7", categoryId: "rent", description: "August rent", amount: 900, date: "2026-08-01" },
];

const DEFAULT_GOALS: Goal[] = [
  { id: "g1", label: "Emergency fund", targetAmount: 3000, savedAmount: 1450 },
  { id: "g2", label: "Trip to Portugal", targetAmount: 800, savedAmount: 300 },
];

const DEFAULT_DEBTS: Debt[] = [{ id: "d1", label: "Car loan", totalAmount: 8000, remainingAmount: 5200, monthlyPayment: 180 }];

interface BudgetData {
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  /** Month key ("2026-08") -> monthly income, set manually or "Apply"'d from Paycheck. */
  incomeByMonth: Record<string, number>;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface BudgetDataContextValue {
  categories: Category[];
  /** This month's categories with `spent` derived from that month's transactions. */
  categoriesWithSpent: CategoryWithSpent[];
  transactions: Transaction[];
  /** Just the transactions that fall in the selected month. */
  transactionsForSelectedMonth: Transaction[];
  goals: Goal[];
  debts: Debt[];

  selectedMonth: string;
  isCurrentMonth: boolean;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;

  incomeForSelectedMonth: number | undefined;
  setIncomeForSelectedMonth: (amount: number) => void;

  addCategory: (input: { label: string; type: CategoryType; limit: number }) => void;
  /** Edit any part of a category — name, limit, type, or color. */
  updateCategory: (id: CategoryId, patch: Partial<Pick<Category, "label" | "limit" | "type" | "colorVar">>) => void;
  deleteCategory: (id: CategoryId) => void;
  addTransaction: (input: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  updateGoal: (id: string, patch: Partial<Pick<Goal, "label" | "targetAmount" | "savedAmount">>) => void;
  addGoal: (input: Omit<Goal, "id">) => void;
  deleteGoal: (id: string) => void;
  updateDebt: (id: string, patch: Partial<Pick<Debt, "label" | "totalAmount" | "remainingAmount" | "monthlyPayment">>) => void;
  addDebt: (input: Omit<Debt, "id">) => void;
  deleteDebt: (id: string) => void;
}

const BudgetDataContext = createContext<BudgetDataContextValue | null>(null);

export function BudgetDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = usePersistentState<BudgetData>("calm-budget:data", {
    categories: DEFAULT_CATEGORIES,
    transactions: DEFAULT_TRANSACTIONS,
    goals: DEFAULT_GOALS,
    debts: DEFAULT_DEBTS,
    incomeByMonth: {},
  });

  // Which month is being viewed — always opens on the real current month,
  // like a calendar app, rather than remembering where you last left off.
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey());

  // Categories saved before "type" existed won't have one — default those
  // to "variable" rather than letting them silently vanish from both the
  // Fixed and Variable sections.
  const categories = useMemo(
    () => data.categories.map((c) => (c.type ? c : { ...c, type: "variable" as const })),
    [data.categories]
  );

  const transactionsForSelectedMonth = useMemo(
    () => data.transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [data.transactions, selectedMonth]
  );

  const categoriesWithSpent = useMemo<CategoryWithSpent[]>(() => {
    const spentByCategory = new Map<CategoryId, number>();
    for (const t of transactionsForSelectedMonth) {
      spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
    }
    return categories.map((c) => ({ ...c, spent: spentByCategory.get(c.id) ?? 0 }));
  }, [categories, transactionsForSelectedMonth]);

  const value: BudgetDataContextValue = {
    categories,
    categoriesWithSpent,
    transactions: data.transactions,
    transactionsForSelectedMonth,
    goals: data.goals,
    debts: data.debts,

    selectedMonth,
    isCurrentMonth: selectedMonth === currentMonthKey(),
    goToPreviousMonth: () => setSelectedMonth((m) => shiftMonthKey(m, -1)),
    goToNextMonth: () => setSelectedMonth((m) => shiftMonthKey(m, 1)),
    goToCurrentMonth: () => setSelectedMonth(currentMonthKey()),

    incomeForSelectedMonth: data.incomeByMonth[selectedMonth],
    setIncomeForSelectedMonth(amount) {
      setData({ ...data, incomeByMonth: { ...data.incomeByMonth, [selectedMonth]: amount } });
    },

    addCategory({ label, type, limit }) {
      const category: Category = {
        id: makeId(),
        label,
        type,
        limit: Math.max(0, limit),
        colorVar: nextColorVar(data.categories.length),
        description: "",
      };
      setData({ ...data, categories: [...data.categories, category] });
    },

    updateCategory(id, patch) {
      const clean = "limit" in patch ? { ...patch, limit: Math.max(0, patch.limit ?? 0) } : patch;
      setData({ ...data, categories: data.categories.map((c) => (c.id === id ? { ...c, ...clean } : c)) });
    },

    deleteCategory(id) {
      setData({ ...data, categories: data.categories.filter((c) => c.id !== id) });
    },

    addTransaction(input) {
      setData({ ...data, transactions: [{ ...input, id: makeId() }, ...data.transactions] });
    },

    updateTransaction(id, patch) {
      setData({ ...data, transactions: data.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    },

    deleteTransaction(id) {
      setData({ ...data, transactions: data.transactions.filter((t) => t.id !== id) });
    },

    updateGoal(id, patch) {
      setData({ ...data, goals: data.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
    },

    addGoal(input) {
      setData({ ...data, goals: [...data.goals, { ...input, id: makeId() }] });
    },

    deleteGoal(id) {
      setData({ ...data, goals: data.goals.filter((g) => g.id !== id) });
    },

    updateDebt(id, patch) {
      setData({ ...data, debts: data.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
    },

    addDebt(input) {
      setData({ ...data, debts: [...data.debts, { ...input, id: makeId() }] });
    },

    deleteDebt(id) {
      setData({ ...data, debts: data.debts.filter((d) => d.id !== id) });
    },
  };

  return <BudgetDataContext.Provider value={value}>{children}</BudgetDataContext.Provider>;
}

export function useBudgetData(): BudgetDataContextValue {
  const ctx = useContext(BudgetDataContext);
  if (!ctx) throw new Error("useBudgetData must be used within a BudgetDataProvider");
  return ctx;
}
