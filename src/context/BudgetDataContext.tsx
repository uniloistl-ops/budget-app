import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { CATEGORY_ORDER } from "../config/categories";
import { usePersistentState } from "../lib/usePersistentState";
import { currentMonthKey, shiftMonthKey } from "../lib/dates";
import type { Category, CategoryId, CategoryWithSpent, Goal, Transaction } from "../types";

const DEFAULT_LIMITS: Record<CategoryId, number> = {
  rent: 900,
  groceries: 350,
  transport: 90,
  subscriptions: 60,
  savings: 300,
  fun: 150,
};

const DEFAULT_CATEGORIES: Category[] = CATEGORY_ORDER.map((c) => ({ ...c, limit: DEFAULT_LIMITS[c.id] }));

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

interface BudgetData {
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
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

  selectedMonth: string;
  isCurrentMonth: boolean;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;

  incomeForSelectedMonth: number | undefined;
  setIncomeForSelectedMonth: (amount: number) => void;

  updateCategoryLimit: (id: CategoryId, limit: number) => void;
  addTransaction: (input: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  updateGoal: (id: string, patch: Partial<Pick<Goal, "label" | "targetAmount" | "savedAmount">>) => void;
  addGoal: (input: Omit<Goal, "id">) => void;
  deleteGoal: (id: string) => void;
}

const BudgetDataContext = createContext<BudgetDataContextValue | null>(null);

export function BudgetDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = usePersistentState<BudgetData>("calm-budget:data", {
    categories: DEFAULT_CATEGORIES,
    transactions: DEFAULT_TRANSACTIONS,
    goals: DEFAULT_GOALS,
    incomeByMonth: {},
  });

  // Which month is being viewed — always opens on the real current month,
  // like a calendar app, rather than remembering where you last left off.
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey());

  const transactionsForSelectedMonth = useMemo(
    () => data.transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [data.transactions, selectedMonth]
  );

  const categoriesWithSpent = useMemo<CategoryWithSpent[]>(() => {
    const spentByCategory = new Map<CategoryId, number>();
    for (const t of transactionsForSelectedMonth) {
      spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
    }
    return data.categories.map((c) => ({ ...c, spent: spentByCategory.get(c.id) ?? 0 }));
  }, [data.categories, transactionsForSelectedMonth]);

  const value: BudgetDataContextValue = {
    categories: data.categories,
    categoriesWithSpent,
    transactions: data.transactions,
    transactionsForSelectedMonth,
    goals: data.goals,

    selectedMonth,
    isCurrentMonth: selectedMonth === currentMonthKey(),
    goToPreviousMonth: () => setSelectedMonth((m) => shiftMonthKey(m, -1)),
    goToNextMonth: () => setSelectedMonth((m) => shiftMonthKey(m, 1)),
    goToCurrentMonth: () => setSelectedMonth(currentMonthKey()),

    incomeForSelectedMonth: data.incomeByMonth[selectedMonth],
    setIncomeForSelectedMonth(amount) {
      setData({ ...data, incomeByMonth: { ...data.incomeByMonth, [selectedMonth]: amount } });
    },

    updateCategoryLimit(id, limit) {
      setData({
        ...data,
        categories: data.categories.map((c) => (c.id === id ? { ...c, limit: Math.max(0, limit) } : c)),
      });
    },

    addTransaction(input) {
      setData({ ...data, transactions: [{ ...input, id: makeId() }, ...data.transactions] });
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
  };

  return <BudgetDataContext.Provider value={value}>{children}</BudgetDataContext.Provider>;
}

export function useBudgetData(): BudgetDataContextValue {
  const ctx = useContext(BudgetDataContext);
  if (!ctx) throw new Error("useBudgetData must be used within a BudgetDataProvider");
  return ctx;
}
