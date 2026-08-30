import { useMemo, useState, type FormEvent } from "react";
import { MonthNav } from "../components/MonthNav";
import { TransactionRow } from "../components/TransactionRow";
import { getCategoryColor } from "../config/categories";
import { useBudgetData } from "../context/BudgetDataContext";
import { firstDayOfMonth, formatMonthLabel } from "../lib/dates";
import type { Category, CategoryId } from "../types";
import "./Transactions.css";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function AddTransactionForm({
  categories,
  defaultDate,
  onClose,
}: {
  categories: Category[];
  defaultDate: string;
  onClose: () => void;
}) {
  const { addTransaction } = useBudgetData();
  const [categoryId, setCategoryId] = useState<CategoryId>(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!description.trim() || !Number.isFinite(value) || value <= 0 || !categoryId) return;
    addTransaction({ categoryId, description: description.trim(), amount: value, date });
    onClose();
  }

  return (
    <form className="card transactions__add-form" onSubmit={submit}>
      <h2>Log a transaction</h2>
      <div className="transactions__add-grid">
        <label className="transactions__add-field">
          <span>Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="transactions__add-field">
          <span>Description</span>
          <input
            type="text"
            placeholder="e.g. Migros"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
        </label>
        <label className="transactions__add-field">
          <span>Amount</span>
          <div className="transactions__add-euro">
            <span>€</span>
            <input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </label>
        <label className="transactions__add-field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="transactions__add-actions">
        <button type="submit" className="transactions__add-submit">
          Add
        </button>
        <button type="button" className="transactions__add-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Transactions() {
  const { categories, transactionsForSelectedMonth, updateTransaction, deleteTransaction, selectedMonth, isCurrentMonth } =
    useBudgetData();
  const [showAddForm, setShowAddForm] = useState(false);
  // Categories you've hidden from view — an opt-out set (rather than an
  // opt-in one) so a category you add later shows up by default.
  const [hiddenCategories, setHiddenCategories] = useState<Set<CategoryId>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<CategoryId>>(new Set());

  function toggleCategory(id: CategoryId) {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCollapsed(id: CategoryId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped = useMemo(() => {
    return categories
      .filter((c) => !hiddenCategories.has(c.id))
      .map((cat) => ({
        category: cat,
        transactions: transactionsForSelectedMonth
          .filter((t) => t.categoryId === cat.id)
          .sort((a, b) => (a.date < b.date ? 1 : -1)),
      }));
  }, [categories, hiddenCategories, transactionsForSelectedMonth]);

  return (
    <div className="transactions">
      <header className="transactions__header">
        <div>
          <h1>Transactions</h1>
          <p>Grouped by category so you can focus on one at a time.</p>
        </div>
        <MonthNav />
        {!showAddForm && (
          <button type="button" className="overview__cta" onClick={() => setShowAddForm(true)}>
            + Log a transaction
          </button>
        )}
      </header>

      {showAddForm && (
        <AddTransactionForm
          categories={categories}
          defaultDate={isCurrentMonth ? todayIso() : firstDayOfMonth(selectedMonth)}
          onClose={() => setShowAddForm(false)}
        />
      )}

      <div className="transactions__filters" role="group" aria-label="Filter by category">
        {categories.map((cat) => {
          const active = !hiddenCategories.has(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              className={"transactions__filter-chip" + (active ? " transactions__filter-chip--active" : "")}
              style={active ? { borderColor: getCategoryColor(cat.colorVar) } : undefined}
              onClick={() => toggleCategory(cat.id)}
              aria-pressed={active}
            >
              <span
                className="transactions__filter-dot"
                style={{ background: getCategoryColor(cat.colorVar) }}
                aria-hidden="true"
              />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="transactions__groups">
        {grouped.map(({ category, transactions: categoryTransactions }) => (
          <section key={category.id} className="card transactions__group">
            <button
              type="button"
              className="transactions__group-header"
              onClick={() => toggleCollapsed(category.id)}
              aria-expanded={!collapsed.has(category.id)}
            >
              <span
                className="transactions__group-dot"
                style={{ background: getCategoryColor(category.colorVar) }}
                aria-hidden="true"
              />
              <h2>{category.label}</h2>
              <span className="transactions__group-count">{categoryTransactions.length}</span>
              <span className="transactions__group-chevron" aria-hidden="true">
                {collapsed.has(category.id) ? "▸" : "▾"}
              </span>
            </button>

            {!collapsed.has(category.id) &&
              (categoryTransactions.length > 0 ? (
                <div>
                  {categoryTransactions.map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      categories={categories}
                      onUpdate={(patch) => updateTransaction(t.id, patch)}
                      onDelete={() => deleteTransaction(t.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="transactions__empty">No transactions in {formatMonthLabel(selectedMonth)} yet.</p>
              ))}
          </section>
        ))}

        {grouped.length === 0 && (
          <p className="transactions__empty">No categories selected — pick one above to see its transactions.</p>
        )}
      </div>
    </div>
  );
}
