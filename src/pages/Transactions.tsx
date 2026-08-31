import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CardMenu } from "../components/CardMenu";
import { IconFolder } from "../components/icons";
import { MonthNav } from "../components/MonthNav";
import { TransactionRow } from "../components/TransactionRow";
import { getCategoryColor } from "../config/categories";
import { useBudgetData } from "../context/BudgetDataContext";
import { firstDayOfMonth, formatMonthLabel } from "../lib/dates";
import type { Category, CategoryId, Folder } from "../types";
import "./Transactions.css";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function AddTransactionForm({
  categories,
  defaultCategoryId,
  defaultDate,
  onClose,
}: {
  categories: Category[];
  defaultCategoryId: string;
  defaultDate: string;
  onClose: () => void;
}) {
  const { addTransaction } = useBudgetData();
  const [categoryId, setCategoryId] = useState<CategoryId>(defaultCategoryId);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const fixedCategories = categories.filter((c) => c.type === "fixed");
  const variableCategories = categories.filter((c) => c.type === "variable");

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
            {fixedCategories.length > 0 && (
              <optgroup label="Fixed costs">
                {fixedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            )}
            {variableCategories.length > 0 && (
              <optgroup label="Variable costs">
                {variableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            )}
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

function FolderRow({ folder }: { folder: Folder }) {
  const { updateFolder, deleteFolder } = useBudgetData();
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(folder.label);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function save() {
    if (!draftLabel.trim()) return;
    updateFolder(folder.id, { label: draftLabel.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="transactions__folder-row transactions__folder-row--editing">
        <input
          type="text"
          className="transactions__folder-row-text"
          value={draftLabel}
          autoFocus
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <div className="transactions__folder-row-actions">
          <button type="button" className="transactions__folder-row-save" onClick={save}>
            Save
          </button>
          <button type="button" className="transactions__folder-row-cancel" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions__folder-row">
      <span className="transactions__folder-row-label">{folder.label}</span>
      {confirmingDelete ? (
        <div className="transactions__folder-row-confirm">
          <span>Delete? Categories inside stay — just unfiled.</span>
          <button type="button" className="transactions__folder-row-confirm-yes" onClick={() => deleteFolder(folder.id)}>
            Yes
          </button>
          <button type="button" className="transactions__folder-row-confirm-no" onClick={() => setConfirmingDelete(false)}>
            No
          </button>
        </div>
      ) : (
        <CardMenu
          label={`${folder.label} actions`}
          items={[
            {
              label: "Rename",
              onClick: () => {
                setDraftLabel(folder.label);
                setEditing(true);
              },
            },
            { label: "Delete", onClick: () => setConfirmingDelete(true), destructive: true },
          ]}
        />
      )}
    </div>
  );
}

export function Transactions() {
  const {
    categories,
    folders,
    transactionsForSelectedMonth,
    updateTransaction,
    deleteTransaction,
    updateCategory,
    selectedMonth,
    isCurrentMonth,
  } = useBudgetData();
  const [collapsed, setCollapsed] = useState<Set<CategoryId>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddFolderForm, setShowAddFolderForm] = useState(false);
  const [showManageFolders, setShowManageFolders] = useState(false);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);

  function toggleCollapsed(id: CategoryId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // The filtered folder can vanish (e.g. deleted) — fall back to "All"
  // rather than showing a blank/broken list.
  useEffect(() => {
    if (folderFilter && !folders.some((f) => f.id === folderFilter)) setFolderFilter(null);
  }, [folderFilter, folders]);

  const folderLabels = useMemo(() => new Map(folders.map((f) => [f.id, f.label])), [folders]);

  const visibleCategories = folderFilter ? categories.filter((c) => c.folderId === folderFilter) : categories;
  const fixedCategories = visibleCategories.filter((c) => c.type === "fixed");
  const variableCategories = visibleCategories.filter((c) => c.type === "variable");

  const defaultCategoryId = categories[0]?.id ?? "";

  function renderCategoryGroup(category: Category) {
    const categoryTransactions = transactionsForSelectedMonth
      .filter((t) => t.categoryId === category.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const folderLabel = category.folderId ? folderLabels.get(category.folderId) : undefined;

    return (
      <section key={category.id} className="card transactions__group">
        <div className="transactions__group-header-row">
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
            {folderLabel && (
              <span className="transactions__folder-badge">
                <IconFolder className="transactions__folder-badge-icon" aria-hidden="true" />
                {folderLabel}
              </span>
            )}
            <span className="transactions__group-count">{categoryTransactions.length}</span>
            <span className="transactions__group-chevron" aria-hidden="true">
              {collapsed.has(category.id) ? "▸" : "▾"}
            </span>
          </button>
          {folders.length > 0 && (
            <CardMenu
              label={`Move "${category.label}" to a folder`}
              items={[
                { label: "No folder", onClick: () => updateCategory(category.id, { folderId: null }) },
                ...folders.map((f) => ({
                  label: f.label,
                  onClick: () => updateCategory(category.id, { folderId: f.id }),
                })),
              ]}
            />
          )}
        </div>

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
  }

  return (
    <div className="transactions">
      <header className="transactions__header">
        <div>
          <h1>Transactions</h1>
          <p>Every category, grouped as fixed or variable costs. Folders are optional, for extra organizing.</p>
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
          defaultCategoryId={defaultCategoryId}
          defaultDate={isCurrentMonth ? todayIso() : firstDayOfMonth(selectedMonth)}
          onClose={() => setShowAddForm(false)}
        />
      )}

      <div className="transactions__folder-toolbar">
        {folders.length > 0 && (
          <div className="transactions__folder-filter" role="radiogroup" aria-label="Filter by folder">
            <button
              type="button"
              className={"transactions__folder-filter-btn" + (folderFilter === null ? " transactions__folder-filter-btn--active" : "")}
              onClick={() => setFolderFilter(null)}
            >
              All
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                className={
                  "transactions__folder-filter-btn" + (folderFilter === f.id ? " transactions__folder-filter-btn--active" : "")
                }
                onClick={() => setFolderFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div className="transactions__folder-actions">
          {!showAddFolderForm && (
            <button type="button" className="transactions__add-folder-link" onClick={() => setShowAddFolderForm(true)}>
              + Add folder
            </button>
          )}
          {folders.length > 0 && (
            <button type="button" className="transactions__add-folder-link" onClick={() => setShowManageFolders((v) => !v)}>
              {showManageFolders ? "Done" : "Manage folders"}
            </button>
          )}
        </div>
      </div>

      {showAddFolderForm && <AddFolderForm onClose={() => setShowAddFolderForm(false)} />}

      {showManageFolders && folders.length > 0 && (
        <div className="card transactions__folder-manage">
          {folders.map((f) => (
            <FolderRow key={f.id} folder={f} />
          ))}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="transactions__empty">No categories yet — add one from the Categories page, then it'll show up here.</p>
      ) : visibleCategories.length === 0 ? (
        <p className="transactions__empty">No categories in this folder yet.</p>
      ) : (
        <>
          {fixedCategories.length > 0 && (
            <section>
              <h2>
                <span className="section-group-dot" style={{ background: "var(--group-fixed)" }} aria-hidden="true" />
                Fixed costs
              </h2>
              <div className="transactions__groups">{fixedCategories.map(renderCategoryGroup)}</div>
            </section>
          )}

          {variableCategories.length > 0 && (
            <section>
              <h2>
                <span className="section-group-dot" style={{ background: "var(--group-variable)" }} aria-hidden="true" />
                Variable costs
              </h2>
              <div className="transactions__groups">{variableCategories.map(renderCategoryGroup)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
