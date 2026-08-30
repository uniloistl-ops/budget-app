import { useState } from "react";
import type { CategoryWithSpent } from "../types";
import { getCategoryColor } from "../config/categories";
import { useSettings } from "../context/SettingsContext";
import { ProgressBar } from "./ProgressBar";
import "./CategoryCard.css";

interface CategoryCardProps {
  category: CategoryWithSpent;
  /** When provided, shows an "Edit" affordance for the monthly limit. */
  onEditLimit?: (newLimit: number) => void;
  /** When provided, shows a delete control with a lightweight confirm step. */
  onDelete?: () => void;
  /** How many transactions (any month) use this category. A non-zero count
   * blocks deletion — otherwise those transactions would silently vanish
   * from totals with no way back. */
  transactionCount?: number;
}

export function CategoryCard({ category, onEditLimit, onDelete, transactionCount = 0 }: CategoryCardProps) {
  const { settings } = useSettings();
  const color = getCategoryColor(category.colorVar);
  const remaining = category.limit - category.spent;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(category.limit));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showBlockedNotice, setShowBlockedNotice] = useState(false);
  const isBlocked = transactionCount > 0;

  function handleDeleteClick() {
    if (isBlocked) {
      setShowBlockedNotice(true);
    } else {
      setConfirmingDelete(true);
    }
  }

  function startEditing() {
    setDraft(String(category.limit));
    setEditing(true);
  }

  function save() {
    const value = Number(draft);
    if (Number.isFinite(value) && value >= 0) {
      onEditLimit?.(value);
    }
    setEditing(false);
  }

  return (
    <div className="category-card">
      <div className="category-card__header">
        <span className="category-card__dot" style={{ background: color }} aria-hidden="true" />
        <h3 className="category-card__label">{category.label}</h3>
        {!editing && !confirmingDelete && !showBlockedNotice && (
          <>
            {onEditLimit && (
              <button type="button" className="category-card__edit-btn" onClick={startEditing}>
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="category-card__delete-btn"
                onClick={handleDeleteClick}
                aria-label={`Delete ${category.label}`}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>

      {showBlockedNotice && (
        <div className="category-card__confirm">
          <span>
            Can't delete — {transactionCount} transaction{transactionCount === 1 ? "" : "s"} use{transactionCount === 1 ? "s" : ""}{" "}
            "{category.label}". Move or delete {transactionCount === 1 ? "it" : "them"} first.
          </span>
          <button type="button" className="category-card__cancel-btn" onClick={() => setShowBlockedNotice(false)}>
            Okay
          </button>
        </div>
      )}

      {confirmingDelete && (
        <div className="category-card__confirm">
          <span>Delete "{category.label}"?</span>
          <div className="category-card__edit-actions">
            <button type="button" className="category-card__save-btn" onClick={onDelete}>
              Yes, delete
            </button>
            <button type="button" className="category-card__cancel-btn" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!confirmingDelete && editing && (
        <div className="category-card__edit-row">
          <span>Monthly limit</span>
          <div className="category-card__edit-input">
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
          <div className="category-card__edit-actions">
            <button type="button" className="category-card__save-btn" onClick={save}>
              Save
            </button>
            <button type="button" className="category-card__cancel-btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!confirmingDelete && !editing && !showBlockedNotice && (
        <>
          {settings.detailLevel === "detailed" && (
            <p className="category-card__amounts">
              <strong>€{category.spent.toFixed(0)}</strong> of €{category.limit.toFixed(0)}
              {remaining >= 0 ? (
                <span className="category-card__remaining"> · €{remaining.toFixed(0)} left</span>
              ) : (
                <span className="category-card__remaining category-card__remaining--over">
                  {" "}
                  · €{Math.abs(remaining).toFixed(0)} over
                </span>
              )}
            </p>
          )}
          <ProgressBar spent={category.spent} limit={category.limit} label={category.label} />
        </>
      )}
    </div>
  );
}
