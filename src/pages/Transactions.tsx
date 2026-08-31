import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconFolder } from "../components/icons";
import { MonthNav } from "../components/MonthNav";
import { TransactionRow } from "../components/TransactionRow";
import { getCategoryColor } from "../config/categories";
import { OTHER_FOLDER_ID, useBudgetData } from "../context/BudgetDataContext";
import { firstDayOfMonth, formatMonthLabel } from "../lib/dates";
import type { Category, CategoryId, Folder } from "../types";
import "./Transactions.css";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FolderGroup {
  id: string;
  label: string;
  categories: Category[];
}

function AddTransactionForm({
  folderGroups,
  defaultCategoryId,
  defaultDate,
  onClose,
}: {
  folderGroups: FolderGroup[];
  defaultCategoryId: string;
  defaultDate: string;
  onClose: () => void;
}) {
  const { addTransaction } = useBudgetData();
  const [categoryId, setCategoryId] = useState<CategoryId>(defaultCategoryId);
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
            {folderGroups.map((f) => (
              <optgroup key={f.id} label={f.label}>
                {f.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
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

function AddFolderForm({ onClose }: { onClose: () => void }) {
  const { addFolder } = useBudgetData();
  const [label, setLabel] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    addFolder({ label: label.trim() });
    onClose();
  }

  return (
    <form className="card transactions__add-form" onSubmit={submit}>
      <h2>New folder</h2>
      <div className="transactions__add-grid">
        <label className="transactions__add-field">
          <span>Name</span>
          <input
            type="text"
            placeholder="e.g. Household, Debt"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </label>
      </div>
      <div className="transactions__add-actions">
        <button type="submit" className="transactions__add-submit">
          Create
        </button>
        <button type="button" className="transactions__add-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Transactions() {
  const {
    categories,
    folders,
    transactionsForSelectedMonth,
    updateTransaction,
    deleteTransaction,
    selectedMonth,
    isCurrentMonth,
  } = useBudgetData();
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<CategoryId>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddFolderForm, setShowAddFolderForm] = useState(false);

  function toggleCollapsed(id: CategoryId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const spentByCategory = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const t of transactionsForSelectedMonth) {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return map;
  }, [transactionsForSelectedMonth]);

  // Every category always has a browsable home: its real folder, or the
  // catch-all "Other" for anything not yet filed — synthesized here only,
  // never stored, so it disappears on its own once everything's foldered.
  const folderGroups: FolderGroup[] = useMemo(() => {
    const real: FolderGroup[] = (folders as Folder[]).map((f) => ({
      id: f.id,
      label: f.label,
      categories: categories.filter((c) => c.folderId === f.id),
    }));
    const other = categories.filter((c) => !c.folderId);
    return other.length > 0 ? [...real, { id: OTHER_FOLDER_ID, label: "Other", categories: other }] : real;
  }, [folders, categories]);

  const activeFolder = folderGroups.find((f) => f.id === openFolderId) ?? null;

  // The open folder can vanish (e.g. deleted from another tab) — fall back
  // to browsing rather than showing a blank/broken detail view.
  useEffect(() => {
    if (openFolderId && !activeFolder) setOpenFolderId(null);
  }, [openFolderId, activeFolder]);

  const defaultCategoryId = activeFolder?.categories[0]?.id ?? categories[0]?.id ?? "";

  return (
    <div className="transactions">
      <header className="transactions__header">
        <div>
          <h1>Transactions</h1>
          <p>Grouped into folders you create, so you only see what you're looking for.</p>
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
          folderGroups={folderGroups}
          defaultCategoryId={defaultCategoryId}
          defaultDate={isCurrentMonth ? todayIso() : firstDayOfMonth(selectedMonth)}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {!activeFolder ? (
        <>
          <div className="transactions__folder-toolbar">
            {!showAddFolderForm && (
              <button type="button" className="transactions__add-folder-link" onClick={() => setShowAddFolderForm(true)}>
                + Add folder
              </button>
            )}
          </div>

          {showAddFolderForm && <AddFolderForm onClose={() => setShowAddFolderForm(false)} />}

          {folderGroups.length > 0 ? (
            <div className="transactions__folder-grid">
              {folderGroups.map((f) => {
                const total = f.categories.reduce((sum, c) => sum + (spentByCategory.get(c.id) ?? 0), 0);
                return (
                  <button
                    key={f.id}
                    type="button"
                    className="transactions__folder-tile"
                    onClick={() => setOpenFolderId(f.id)}
                  >
                    <span className="transactions__folder-tile-icon-row">
                      <IconFolder className="transactions__folder-tile-icon" aria-hidden="true" />
                      <h3>{f.label}</h3>
                    </span>
                    <span className="transactions__folder-tile-amount">€{total.toFixed(2)} this month</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="transactions__empty">
              No categories yet — add one from the Categories page, then it'll show up here.
            </p>
          )}
        </>
      ) : (
        <>
          <button type="button" className="transactions__back-link" onClick={() => setOpenFolderId(null)}>
            ← Folders
          </button>
          <h2 className="transactions__folder-heading">{activeFolder.label}</h2>

          <div className="transactions__groups">
            {activeFolder.categories.map((category) => {
              const categoryTransactions = transactionsForSelectedMonth
                .filter((t) => t.categoryId === category.id)
                .sort((a, b) => (a.date < b.date ? 1 : -1));
              return (
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
                    <h3>{category.label}</h3>
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
              );
            })}

            {activeFolder.categories.length === 0 && (
              <p className="transactions__empty">This folder is empty.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
