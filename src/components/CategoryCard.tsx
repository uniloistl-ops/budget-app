import { useState } from "react";
import type { CategoryType, CategoryWithSpent } from "../types";
import { COLOR_VAR_POOL, getCategoryColor } from "../config/categories";
import { useSettings } from "../context/SettingsContext";
import { CardMenu, type CardMenuItem } from "./CardMenu";
import { ProgressBar } from "./ProgressBar";
import "./CategoryCard.css";

interface CategoryEditPatch {
  label: string;
  limit: number;
  colorVar: string;
}

interface CategoryCardProps {
  category: CategoryWithSpent;
  /** When provided, shows an "Edit" affordance for name, limit and color. */
  onEdit?: (patch: CategoryEditPatch) => void;
  /** When provided, offers "Move to Fixed/Variable" from the menu. */
  onChangeType?: (newType: CategoryType) => void;
  /** When provided, offers delete from the menu, with a lightweight confirm step. */
  onDelete?: () => void;
  /** How many transactions (any month) use this category. A non-zero count
   * blocks deletion — otherwise those transactions would silently vanish
   * from totals with no way back. */
  transactionCount?: number;
}

export function CategoryCard({ category, onEdit, onChangeType, onDelete, transactionCount = 0 }: CategoryCardProps) {
  const { settings } = useSettings();
  const color = getCategoryColor(category.colorVar);
  const remaining = category.limit - category.spent;
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(category.label);
  const [draftLimit, setDraftLimit] = useState(String(category.limit));
  const [draftColorVar, setDraftColorVar] = useState(category.colorVar);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showBlockedNotice, setShowBlockedNotice] = useState(false);
  const isBlocked = transactionCount > 0;

  function startEditing() {
    setDraftLabel(category.label);
    setDraftLimit(String(category.limit));
    setDraftColorVar(category.colorVar);
    setEditing(true);
  }

  function handleDeleteRequest() {
    if (isBlocked) {
      setShowBlockedNotice(true);
    } else {
      setConfirmingDelete(true);
    }
  }

  function save() {
    const limit = Number(draftLimit);
    if (!draftLabel.trim() || !Number.isFinite(limit) || limit < 0) return;
    onEdit?.({ label: draftLabel.trim(), limit, colorVar: draftColorVar });
    setEditing(false);
  }

  const menuItems: CardMenuItem[] = [];
  if (onEdit) menuItems.push({ label: "Edit", onClick: startEditing });
  if (onChangeType) {
    menuItems.push({
      label: `Move to ${category.type === "fixed" ? "Variable" : "Fixed"}`,
      onClick: () => onChangeType(category.type === "fixed" ? "variable" : "fixed"),
    });
  }
  if (onDelete) menuItems.push({ label: "Delete", onClick: handleDeleteRequest, destructive: true });

  const showMenu = menuItems.length > 0 && !editing && !confirmingDelete && !showBlockedNotice;

  return (
    <div className="category-card">
      <div className="category-card__header">
        <span className="category-card__dot" style={{ background: color }} aria-hidden="true" />
        <h3 className="category-card__label">{category.label}</h3>
        {showMenu && <CardMenu items={menuItems} label={`${category.label} actions`} />}
      </div>

      {showBlockedNotice && (
        <div className="category-card__confirm">
          <span>
            Can't delete — {transactionCount} transaction{transactionCount === 1 ? "" : "s"}{" "}
            use{transactionCount === 1 ? "s" : ""} "{category.label}". Move or delete{" "}
            {transactionCount === 1 ? "it" : "them"} first.
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
          <span>Name</span>
          <input
            type="text"
            className="category-card__edit-text"
            autoFocus
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />

          <span>Monthly limit</span>
          <div className="category-card__edit-input">
            <span>€</span>
            <input
              type="number"
              min={0}
              value={draftLimit}
              onChange={(e) => setDraftLimit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          </div>

          <span>Color</span>
          <div className="category-card__swatches" role="radiogroup" aria-label="Category color">
            {COLOR_VAR_POOL.map((cv) => (
              <button
                key={cv}
                type="button"
                role="radio"
                aria-checked={draftColorVar === cv}
                aria-label={cv.replace("--cat-", "").replace("-", " ")}
                className={"category-card__swatch" + (draftColorVar === cv ? " category-card__swatch--active" : "")}
                style={{ background: getCategoryColor(cv) }}
                onClick={() => setDraftColorVar(cv)}
              />
            ))}
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
