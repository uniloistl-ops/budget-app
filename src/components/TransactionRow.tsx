import { useState } from "react";
import type { CategoryId, Transaction } from "../types";
import { CATEGORY_MAP, CATEGORY_ORDER, getCategoryColor } from "../config/categories";
import "./TransactionRow.css";

interface TransactionRowProps {
  transaction: Transaction;
  /** When provided, shows an "Edit" control that turns the row into an inline form. */
  onUpdate?: (patch: Partial<Omit<Transaction, "id">>) => void;
  /** When provided, shows a delete control with a lightweight confirm step. */
  onDelete?: () => void;
}

export function TransactionRow({ transaction, onUpdate, onDelete }: TransactionRowProps) {
  const category = CATEGORY_MAP[transaction.categoryId];
  const date = new Date(transaction.date);
  const dateLabel = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(transaction);

  function startEditing() {
    setDraft(transaction);
    setEditing(true);
  }

  function save() {
    if (!draft.description.trim() || !Number.isFinite(draft.amount) || draft.amount <= 0) return;
    onUpdate?.({
      categoryId: draft.categoryId,
      description: draft.description.trim(),
      amount: draft.amount,
      date: draft.date,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="transaction-row transaction-row--editing">
        <div className="transaction-row__edit-grid">
          <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value as CategoryId })}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            autoFocus
          />
          <div className="transaction-row__edit-euro">
            <span>€</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
            />
          </div>
          <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </div>
        <div className="transaction-row__edit-actions">
          <button type="button" className="transaction-row__save" onClick={save}>
            Save
          </button>
          <button type="button" className="transaction-row__cancel" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-row">
      <span
        className="transaction-row__dot"
        style={{ background: getCategoryColor(transaction.categoryId) }}
        aria-hidden="true"
      />
      <div className="transaction-row__main">
        <span className="transaction-row__description">{transaction.description}</span>
        <span className="transaction-row__category">{category.label}</span>
      </div>

      {confirming ? (
        <div className="transaction-row__confirm">
          <span>Delete?</span>
          <button type="button" className="transaction-row__confirm-yes" onClick={onDelete}>
            Yes
          </button>
          <button type="button" className="transaction-row__confirm-no" onClick={() => setConfirming(false)}>
            No
          </button>
        </div>
      ) : (
        <>
          <span className="transaction-row__date">{dateLabel}</span>
          <span className="transaction-row__amount">€{transaction.amount.toFixed(2)}</span>
          {onUpdate && (
            <button type="button" className="transaction-row__edit-btn" onClick={startEditing}>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="transaction-row__delete"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${transaction.description}`}
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  );
}
