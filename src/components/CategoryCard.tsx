import { useState } from "react";
import type { CategoryType, CategoryWithSpent, Folder } from "../types";
import { COLOR_VAR_POOL, getCategoryColor } from "../config/categories";
import { useSettings } from "../context/SettingsContext";
import { CardMenu, type CardMenuItem } from "./CardMenu";
import { ProgressBar } from "./ProgressBar";
import "./CategoryCard.css";

interface CategoryEditPatch {
  label: string;
  limit: number;
  colorVar: string;
  folderId: string | null;
}

interface CategoryCardProps {
  category: CategoryWithSpent;
  /** When provided, shows an "Edit" affordance for name, limit, color and folder. */
  onEdit?: (patch: CategoryEditPatch) => void;
  /** When provided, offers "Move to Fixed/Variable" from the menu. */
  onChangeType?: (newType: CategoryType) => void;
  /** When provided, offers delete from the menu, with a lightweight confirm step. */
  onDelete?: () => void;
  /** How many transactions (any month) use this category. A non-zero count
   * blocks deletion — otherwise those transactions would silently vanish
   * from totals with no way back. */
  transactionCount?: number;
  /** Existing folders, offered as options in the edit form's Folder picker. */
  folders?: Folder[];
  /** Creates a new folder and returns its id, for the "+ New folder…" quick-create. */
  onCreateFolder?: (label: string) => string;
}

export function CategoryCard({
  category,
  onEdit,
  onChangeType,
  onDelete,
  transactionCount = 0,
  folders = [],
  onCreateFolder,
}: CategoryCardProps) {
  const { settings } = useSettings();
  const color = getCategoryColor(category.colorVar);
  const remaining = category.limit - category.spent;
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(category.label);
  const [draftLimit, setDraftLimit] = useState(String(category.limit));
  const [draftColorVar, setDraftColorVar] = useState(category.colorVar);
  const [draftFolderId, setDraftFolderId] = useState<string | null>(category.folderId ?? null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showBlockedNotice, setShowBlockedNotice] = useState(false);
  const isBlocked = transactionCount > 0;

  function startEditing() {
    setDraftLabel(category.label);
    setDraftLimit(String(category.limit));
    setDraftColorVar(category.colorVar);
    setDraftFolderId(category.folderId ?? null);
    setCreatingFolder(false);
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
    onEdit?.({ label: draftLabel.trim(), limit, colorVar: draftColorVar, folderId: draftFolderId });
    setEditing(false);
  }

  function createFolder() {
    if (!newFolderName.trim() || !onCreateFolder) return;
    const id = onCreateFolder(newFolderName.trim());
    setDraftFolderId(id);
    setNewFolderName("");
    setCreatingFolder(false);
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

  const draftLimitNum = Number(draftLimit);
  const limitBelowSpent = Number.isFinite(draftLimitNum) && draftLimitNum > 0 && draftLimitNum < category.spent;

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
          {limitBelowSpent && (
            <p className="category-card__limit-warning">
              You've already spent €{category.spent.toFixed(0)} this month — this limit is below that.
            </p>
          )}

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

          {onCreateFolder && (
            <>
              <span>Folder</span>
              {creatingFolder ? (
                <div className="category-card__edit-input">
                  <input
                    type="text"
                    placeholder="e.g. Household"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createFolder();
                      if (e.key === "Escape") setCreatingFolder(false);
                    }}
                  />
                </div>
              ) : (
                <select
                  className="category-card__edit-text"
                  value={draftFolderId ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setCreatingFolder(true);
                    } else {
                      setDraftFolderId(e.target.value || null);
                    }
                  }}
                >
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                  <option value="__new__">+ New folder…</option>
                </select>
              )}
              {creatingFolder && (
                <div className="category-card__edit-actions">
                  <button type="button" className="category-card__save-btn" onClick={createFolder}>
                    Create
                  </button>
                  <button type="button" className="category-card__cancel-btn" onClick={() => setCreatingFolder(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

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
