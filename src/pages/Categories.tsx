import { useState, type FormEvent } from "react";
import { CategoryCard } from "../components/CategoryCard";
import { MonthNav } from "../components/MonthNav";
import { ProgressBar } from "../components/ProgressBar";
import { useBudgetData } from "../context/BudgetDataContext";
import { formatMonthLabel } from "../lib/dates";
import type { CategoryType, CategoryWithSpent, Debt } from "../types";
import "./Categories.css";

function AddCategoryForm({ type, onClose }: { type: CategoryType; onClose: () => void }) {
  const { addCategory } = useBudgetData();
  const [label, setLabel] = useState("");
  const [limit, setLimit] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(limit);
    if (!label.trim() || !Number.isFinite(value) || value <= 0) return;
    addCategory({ label: label.trim(), type, limit: value });
    onClose();
  }

  return (
    <form className="card categories-page__add-form" onSubmit={submit}>
      <h3>New {type} cost</h3>
      <div className="categories-page__add-grid">
        <label className="categories-page__add-field">
          <span>Name</span>
          <input
            type="text"
            placeholder={type === "fixed" ? "e.g. Insurance" : "e.g. Clothes"}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </label>
        <label className="categories-page__add-field">
          <span>Monthly {type === "fixed" ? "amount" : "limit"}</span>
          <div className="categories-page__add-euro">
            <span>€</span>
            <input type="number" min={0.01} step={0.01} value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
        </label>
      </div>
      <div className="categories-page__add-actions">
        <button type="submit" className="categories-page__add-submit">
          Add
        </button>
        <button type="button" className="categories-page__add-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CategorySection({
  title,
  hint,
  type,
  categories,
}: {
  title: string;
  hint: string;
  type: CategoryType;
  categories: CategoryWithSpent[];
}) {
  const { transactions, updateCategoryLimit, updateCategoryType, deleteCategory } = useBudgetData();
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <section className="categories-page__section">
      <div className="categories-page__section-header">
        <div>
          <h2>{title}</h2>
          <p className="categories-page__hint">{hint}</p>
        </div>
        {!showAddForm && (
          <button type="button" className="categories-page__add-link" onClick={() => setShowAddForm(true)}>
            + Add {type} cost
          </button>
        )}
      </div>

      {showAddForm && <AddCategoryForm type={type} onClose={() => setShowAddForm(false)} />}

      {categories.length > 0 ? (
        <div className="categories-page__grid">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              onEditLimit={(limit) => updateCategoryLimit(c.id, limit)}
              onChangeType={(type) => updateCategoryType(c.id, type)}
              onDelete={() => deleteCategory(c.id)}
              transactionCount={transactions.filter((t) => t.categoryId === c.id).length}
            />
          ))}
        </div>
      ) : (
        <p className="categories-page__empty">Nothing here yet.</p>
      )}
    </section>
  );
}

function AddDebtForm({ onClose }: { onClose: () => void }) {
  const { addDebt } = useBudgetData();
  const [label, setLabel] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const total = Number(totalAmount);
    const remaining = Number(remainingAmount);
    if (!label.trim() || !Number.isFinite(total) || total <= 0 || !Number.isFinite(remaining) || remaining < 0) return;
    addDebt({
      label: label.trim(),
      totalAmount: total,
      remainingAmount: remaining,
      monthlyPayment: monthlyPayment ? Number(monthlyPayment) : undefined,
    });
    onClose();
  }

  return (
    <form className="card categories-page__add-form" onSubmit={submit}>
      <h3>New debt</h3>
      <div className="categories-page__add-grid">
        <label className="categories-page__add-field">
          <span>What is it?</span>
          <input type="text" placeholder="e.g. Car loan" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
        </label>
        <label className="categories-page__add-field">
          <span>Original amount</span>
          <div className="categories-page__add-euro">
            <span>€</span>
            <input type="number" min={0.01} step={0.01} value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          </div>
        </label>
        <label className="categories-page__add-field">
          <span>Still owed</span>
          <div className="categories-page__add-euro">
            <span>€</span>
            <input type="number" min={0} step={0.01} value={remainingAmount} onChange={(e) => setRemainingAmount(e.target.value)} />
          </div>
        </label>
        <label className="categories-page__add-field">
          <span>Monthly payment (optional)</span>
          <div className="categories-page__add-euro">
            <span>€</span>
            <input type="number" min={0} step={0.01} value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} />
          </div>
        </label>
      </div>
      <div className="categories-page__add-actions">
        <button type="submit" className="categories-page__add-submit">
          Add
        </button>
        <button type="button" className="categories-page__add-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DebtCard({ debt }: { debt: Debt }) {
  const { updateDebt, deleteDebt } = useBudgetData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(debt.remainingAmount));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const paidOff = debt.totalAmount - debt.remainingAmount;

  function save() {
    const value = Number(draft);
    if (Number.isFinite(value) && value >= 0) updateDebt(debt.id, { remainingAmount: value });
    setEditing(false);
  }

  return (
    <div className="card debt-card">
      <div className="debt-card__header">
        <h3>{debt.label}</h3>
        {!editing && !confirmingDelete && (
          <div className="debt-card__actions">
            <span className="debt-card__amounts">
              €{paidOff.toFixed(0)} paid of €{debt.totalAmount.toFixed(0)}
            </span>
            <button
              type="button"
              className="debt-card__edit-btn"
              onClick={() => {
                setDraft(String(debt.remainingAmount));
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="debt-card__delete-btn"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete ${debt.label}`}
            >
              ×
            </button>
          </div>
        )}
        {confirmingDelete && (
          <div className="debt-card__confirm">
            <span>Delete this debt?</span>
            <button type="button" className="debt-card__confirm-yes" onClick={() => deleteDebt(debt.id)}>
              Yes
            </button>
            <button type="button" className="debt-card__confirm-no" onClick={() => setConfirmingDelete(false)}>
              No
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="debt-card__edit-row">
          <span>Amount still owed</span>
          <div className="categories-page__add-euro">
            <span>€</span>
            <input
              type="number"
              min={0}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          </div>
          <div className="categories-page__add-actions">
            <button type="button" className="categories-page__add-submit" onClick={save}>
              Save
            </button>
            <button type="button" className="categories-page__add-cancel" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <ProgressBar spent={paidOff} limit={debt.totalAmount} label={`${debt.label} paid off`} direction="toward-target" />
          {debt.monthlyPayment !== undefined && (
            <p className="debt-card__monthly">€{debt.monthlyPayment.toFixed(0)}/month</p>
          )}
        </>
      )}
    </div>
  );
}

export function Categories() {
  const { categoriesWithSpent, selectedMonth, debts } = useBudgetData();
  const [showAddDebtForm, setShowAddDebtForm] = useState(false);
  const fixedCategories = categoriesWithSpent.filter((c) => c.type === "fixed");
  const variableCategories = categoriesWithSpent.filter((c) => c.type === "variable");

  return (
    <div className="categories-page">
      <header className="categories-page__header">
        <div>
          <h1>Categories</h1>
          <p>
            Spending shown is for {formatMonthLabel(selectedMonth)}. Limits apply every month — tap "Edit" to change
            one.
          </p>
        </div>
        <MonthNav />
      </header>

      <CategorySection
        title="Fixed costs"
        hint="Same amount every month — rent, insurance, subscriptions, gym."
        type="fixed"
        categories={fixedCategories}
      />

      <CategorySection
        title="Variable costs"
        hint="Changes month to month — groceries, transport, fun money."
        type="variable"
        categories={variableCategories}
      />

      <section className="categories-page__section">
        <div className="categories-page__section-header">
          <div>
            <h2>Debt</h2>
            <p className="categories-page__hint">What you owe, and how much you've paid off.</p>
          </div>
          {!showAddDebtForm && (
            <button type="button" className="categories-page__add-link" onClick={() => setShowAddDebtForm(true)}>
              + Add debt
            </button>
          )}
        </div>

        {showAddDebtForm && <AddDebtForm onClose={() => setShowAddDebtForm(false)} />}

        {debts.length > 0 ? (
          <div className="categories-page__grid">
            {debts.map((d) => (
              <DebtCard key={d.id} debt={d} />
            ))}
          </div>
        ) : (
          <p className="categories-page__empty">No debts tracked — nice, or add one to keep an eye on it.</p>
        )}
      </section>
    </div>
  );
}
