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
}

export function CategoryCard({ category, onEditLimit }: CategoryCardProps) {
  const { settings } = useSettings();
  const color = getCategoryColor(category.id);
  const remaining = category.limit - category.spent;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(category.limit));

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
        {onEditLimit && !editing && (
          <button type="button" className="category-card__edit-btn" onClick={startEditing}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
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
      ) : (
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
