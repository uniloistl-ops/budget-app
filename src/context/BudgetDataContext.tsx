import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { nextColorVar } from "../config/categories";
import { usePersistentState } from "../lib/usePersistentState";
import { currentMonthKey, shiftMonthKey } from "../lib/dates";
import type { Category, CategoryId, CategoryType, CategoryWithSpent, Debt, Folder, Goal, IncomeSource, Transaction } from "../types";

/** The id "Apply" on the Paycheck tab writes to, so re-applying updates
 * the same entry instead of piling up duplicates. */
const PAYCHECK_SOURCE_ID = "paycheck";

// A starter set of category names so the app isn't a blank wall on first
// run — but no fake limits or history. Rename, delete, or add to these
// freely from the Categories page; every amount starts at zero, waiting
// for your real numbers.
const DEFAULT_CATEGORIES: Category[] = [
  { id: "rent", label: "Rent", colorVar: "--cat-rent", description: "Where you live", limit: 0, type: "fixed", folderId: null },
  { id: "groceries", label: "Groceries", colorVar: "--cat-groceries", description: "Food & household", limit: 0, type: "variable", folderId: null },
  { id: "transport", label: "Transport", colorVar: "--cat-transport", description: "Getting around", limit: 0, type: "variable", folderId: null },
  { id: "subscriptions", label: "Subscriptions", colorVar: "--cat-subscriptions", description: "Regular services", limit: 0, type: "fixed", folderId: null },
  { id: "savings", label: "Savings", colorVar: "--cat-savings", description: "Future you", limit: 0, type: "fixed", folderId: null },
  { id: "fun", label: "Fun money", colorVar: "--cat-fun", description: "No guilt spending", limit: 0, type: "variable", folderId: null },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [];

const DEFAULT_GOALS: Goal[] = [];

const DEFAULT_DEBTS: Debt[] = [];

const DEFAULT_FOLDERS: Folder[] = [];

interface BudgetData {
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  folders: Folder[];
  /** Month key ("2026-08") -> that month's income sources (paycheck, side
   * gigs, gifts, refunds, ...) — the month's total is their sum. */
  incomeSourcesByMonth: Record<string, IncomeSource[]>;
  /** Set once the one-time "folders are optional now" reset (below) has
   * run, so it never re-fires and re-clears folders someone creates later. */
  foldersResetV1?: boolean;
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
  folders: Folder[];

  selectedMonth: string;
  isCurrentMonth: boolean;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;

  /** Every income source for the viewed month (including the "Paycheck" one, if applied). */
  incomeSourcesForSelectedMonth: IncomeSource[];
  /** Sum of all sources — undefined if none have been added yet. */
  incomeForSelectedMonth: number | undefined;
  /** Just the "Paycheck" source's amount for the viewed month — used by the
   * Paycheck tab's own "already applied" check for that month. */
  paycheckIncomeForSelectedMonth: number | undefined;
  /** Same, but for an arbitrary month key — used when Apply targets a
   * different month than the one currently being viewed (payment lag). */
  paycheckIncomeForMonth: (monthKey: string) => number | undefined;
  /** Upserts the one "Paycheck" source for the viewed month. */
  setIncomeForSelectedMonth: (amount: number) => void;
  /** Same, but for an arbitrary month key. */
  setIncomeForMonth: (monthKey: string, amount: number) => void;
  addIncomeSource: (input: { label: string; amount: number }) => void;
  updateIncomeSource: (id: string, patch: Partial<Pick<IncomeSource, "label" | "amount">>) => void;
  deleteIncomeSource: (id: string) => void;

  addCategory: (input: { label: string; type: CategoryType; limit: number }) => void;
  /** Edit any part of a category — name, limit, type, color, or folder. */
  updateCategory: (id: CategoryId, patch: Partial<Pick<Category, "label" | "limit" | "type" | "colorVar" | "folderId">>) => void;
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
  /** Creates a folder and returns its id. */
  addFolder: (input: { label: string }) => string;
  updateFolder: (id: string, patch: Partial<Pick<Folder, "label">>) => void;
  /** Deletes the folder; categories inside it become unfiled (no folder) —
   * their transactions and the categories themselves are untouched. */
  deleteFolder: (id: string) => void;
}

const BudgetDataContext = createContext<BudgetDataContextValue | null>(null);

export function BudgetDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = usePersistentState<BudgetData>("calm-budget:data", {
    categories: DEFAULT_CATEGORIES,
    transactions: DEFAULT_TRANSACTIONS,
    goals: DEFAULT_GOALS,
    debts: DEFAULT_DEBTS,
    folders: DEFAULT_FOLDERS,
    incomeSourcesByMonth: {},
  });

  // Which month is being viewed — always opens on the real current month,
  // like a calendar app, rather than remembering where you last left off.
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey());

  const folders = data.folders ?? DEFAULT_FOLDERS;

  // Before multiple income sources existed, each month stored a single
  // number. Fold any of those into the new shape as a "Paycheck" entry,
  // rather than losing them.
  const incomeSourcesByMonth = useMemo(() => {
    const legacy = (data as unknown as { incomeByMonth?: Record<string, number> }).incomeByMonth;
    if (!legacy) return data.incomeSourcesByMonth;
    const merged = { ...data.incomeSourcesByMonth };
    for (const [month, amount] of Object.entries(legacy)) {
      if (!merged[month] && typeof amount === "number") {
        merged[month] = [{ id: PAYCHECK_SOURCE_ID, label: "Paycheck", amount }];
      }
    }
    return merged;
  }, [data]);

  // Categories saved before "type"/"folderId" existed won't have them —
  // default those rather than letting them silently vanish or break.
  const categories = useMemo(
    () =>
      data.categories.map((c) => {
        const withType = c.type ? c : { ...c, type: "variable" as const };
        return "folderId" in withType ? withType : { ...withType, folderId: null };
      }),
    [data.categories]
  );

  // One-time reset: folders used to gate the entire Transactions page (open
  // a folder to see anything inside it), which turned out confusing —
  // categories are now always visible, and folders are purely an optional
  // extra. Any folders/assignments made under the old model no longer
  // apply, so this clears them once per browser. Categories and
  // transactions themselves are never touched.
  useEffect(() => {
    if (data.foldersResetV1) return;
    setData({
      ...data,
      folders: [],
      categories: data.categories.map((c) => (c.folderId ? { ...c, folderId: null } : c)),
      foldersResetV1: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.foldersResetV1]);

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

  function paycheckIncomeForMonth(monthKey: string): number | undefined {
    return incomeSourcesByMonth[monthKey]?.find((s) => s.id === PAYCHECK_SOURCE_ID)?.amount;
  }

  function setIncomeForMonth(monthKey: string, amount: number) {
    const existing = incomeSourcesByMonth[monthKey] ?? [];
    const rest = existing.filter((s) => s.id !== PAYCHECK_SOURCE_ID);
    setData({
      ...data,
      incomeSourcesByMonth: {
        ...incomeSourcesByMonth,
        [monthKey]: [{ id: PAYCHECK_SOURCE_ID, label: "Paycheck", amount }, ...rest],
      },
    });
  }

  const value: BudgetDataContextValue = {
    categories,
    categoriesWithSpent,
    transactions: data.transactions,
    transactionsForSelectedMonth,
    goals: data.goals,
    debts: data.debts,
    folders,

    selectedMonth,
    isCurrentMonth: selectedMonth === currentMonthKey(),
    goToPreviousMonth: () => setSelectedMonth((m) => shiftMonthKey(m, -1)),
    goToNextMonth: () => setSelectedMonth((m) => shiftMonthKey(m, 1)),
    goToCurrentMonth: () => setSelectedMonth(currentMonthKey()),

    incomeSourcesForSelectedMonth: incomeSourcesByMonth[selectedMonth] ?? [],
    incomeForSelectedMonth: incomeSourcesByMonth[selectedMonth]?.length
      ? incomeSourcesByMonth[selectedMonth].reduce((sum, s) => sum + s.amount, 0)
      : undefined,
    paycheckIncomeForSelectedMonth: paycheckIncomeForMonth(selectedMonth),
    paycheckIncomeForMonth,
    setIncomeForSelectedMonth: (amount) => setIncomeForMonth(selectedMonth, amount),
    setIncomeForMonth,

    addIncomeSource({ label, amount }) {
      const existing = incomeSourcesByMonth[selectedMonth] ?? [];
      setData({
        ...data,
        incomeSourcesByMonth: {
          ...incomeSourcesByMonth,
          [selectedMonth]: [...existing, { id: makeId(), label, amount }],
        },
      });
    },

    updateIncomeSource(id, patch) {
      const existing = incomeSourcesByMonth[selectedMonth] ?? [];
      setData({
        ...data,
        incomeSourcesByMonth: {
          ...incomeSourcesByMonth,
          [selectedMonth]: existing.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        },
      });
    },

    deleteIncomeSource(id) {
      const existing = incomeSourcesByMonth[selectedMonth] ?? [];
      setData({
        ...data,
        incomeSourcesByMonth: { ...incomeSourcesByMonth, [selectedMonth]: existing.filter((s) => s.id !== id) },
      });
    },

    addCategory({ label, type, limit }) {
      const category: Category = {
        id: makeId(),
        label,
        type,
        limit: Math.max(0, limit),
        colorVar: nextColorVar(data.categories.length),
        description: "",
        folderId: null,
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

    addFolder({ label }) {
      const folder: Folder = { id: makeId(), label };
      setData({ ...data, folders: [...folders, folder] });
      return folder.id;
    },

    updateFolder(id, patch) {
      setData({ ...data, folders: folders.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
    },

    deleteFolder(id) {
      setData({
        ...data,
        folders: folders.filter((f) => f.id !== id),
        categories: data.categories.map((c) => (c.folderId === id ? { ...c, folderId: null } : c)),
      });
    },
  };

  return <BudgetDataContext.Provider value={value}>{children}</BudgetDataContext.Provider>;
}

export function useBudgetData(): BudgetDataContextValue {
  const ctx = useContext(BudgetDataContext);
  if (!ctx) throw new Error("useBudgetData must be used within a BudgetDataProvider");
  return ctx;
}
