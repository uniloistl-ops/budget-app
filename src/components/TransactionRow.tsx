import { useState } from "react";
import type { Transaction } from "../types";
import { CATEGORY_MAP, getCategoryColor } from "../config/categories";
import "./TransactionRow.css";

interface TransactionRowProps {
  transaction: Transaction;
  /** When provided, shows a delete control with a lightweight confirm step. */
  onDelete?: () => void;
}

export function TransactionRow({ transaction, onDelete }: TransactionRowProps) {
  const category = CATEGORY_MAP[transaction.categoryId];
  const date = new Date(transaction.date);
  const dateLabel = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const [confirming, setConfirming] = useState(false);

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
