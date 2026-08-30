import { useState, type FormEvent } from "react";
import { ProgressBar } from "../components/ProgressBar";
import { useBudgetData } from "../context/BudgetDataContext";
import type { Goal } from "../types";
import "./Goals.css";

function AddGoalForm({ onClose }: { onClose: () => void }) {
  const { addGoal } = useBudgetData();
  const [label, setLabel] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("0");

  function submit(e: FormEvent) {
    e.preventDefault();
    const target = Number(targetAmount);
    const saved = Number(savedAmount) || 0;
    if (!label.trim() || !Number.isFinite(target) || target <= 0) return;
    addGoal({ label: label.trim(), targetAmount: target, savedAmount: Math.max(0, saved) });
    onClose();
  }

  return (
    <form className="card goals-page__add-form" onSubmit={submit}>
      <h2>New goal</h2>
      <div className="goals-page__add-grid">
        <label className="goals-page__add-field">
          <span>What are you saving for?</span>
          <input type="text" placeholder="e.g. New laptop" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
        </label>
        <label className="goals-page__add-field">
          <span>Target amount</span>
          <div className="goals-page__add-euro">
            <span>€</span>
            <input type="number" min={0.01} step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          </div>
        </label>
        <label className="goals-page__add-field">
          <span>Already saved</span>
          <div className="goals-page__add-euro">
            <span>€</span>
            <input type="number" min={0} step="0.01" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} />
          </div>
        </label>
      </div>
      <div className="goals-page__add-actions">
        <button type="submit" className="goals-page__add-submit">Add goal</button>
        <button type="button" className="goals-page__add-cancel" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { updateGoal, deleteGoal } = useBudgetData();
  const [editing, setEditing] = useState(false);
  const [draftSaved, setDraftSaved] = useState(String(goal.savedAmount));
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function save() {
    const value = Number(draftSaved);
    if (Number.isFinite(value) && value >= 0) updateGoal(goal.id, { savedAmount: value });
    setEditing(false);
  }

  return (
    <div className="card goals-page__card">
      <div className="goals-page__card-header">
        <h2>{goal.label}</h2>
        {!editing && !confirmingDelete && (
          <div className="goals-page__card-actions">
            <span className="goals-page__amounts">
              €{goal.savedAmount.toFixed(0)} of €{goal.targetAmount.toFixed(0)}
            </span>
            <button type="button" className="goals-page__edit-btn" onClick={() => { setDraftSaved(String(goal.savedAmount)); setEditing(true); }}>
              Edit
            </button>
            <button type="button" className="goals-page__delete-btn" onClick={() => setConfirmingDelete(true)} aria-label={`Delete ${goal.label}`}>
              ×
            </button>
          </div>
        )}
        {confirmingDelete && (
          <div className="goals-page__confirm">
            <span>Delete this goal?</span>
            <button type="button" className="goals-page__confirm-yes" onClick={() => deleteGoal(goal.id)}>Yes</button>
            <button type="button" className="goals-page__confirm-no" onClick={() => setConfirmingDelete(false)}>No</button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="goals-page__edit-row">
          <span>Amount saved so far</span>
          <div className="goals-page__add-euro">
            <span>€</span>
            <input
              type="number"
              min={0}
              autoFocus
              value={draftSaved}
              onChange={(e) => setDraftSaved(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          </div>
          <div className="goals-page__add-actions">
            <button type="button" className="goals-page__add-submit" onClick={save}>Save</button>
            <button type="button" className="goals-page__add-cancel" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <ProgressBar spent={goal.savedAmount} limit={goal.targetAmount} label={goal.label} direction="toward-target" />
      )}
    </div>
  );
}

export function Goals() {
  const { goals } = useBudgetData();
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="goals-page">
      <header className="goals-page__header">
        <div>
          <h1>Goals</h1>
          <p>Things you're saving toward, and how close you are.</p>
        </div>
        {!showAddForm && (
          <button type="button" className="overview__cta" onClick={() => setShowAddForm(true)}>
            + New goal
          </button>
        )}
      </header>

      {showAddForm && <AddGoalForm onClose={() => setShowAddForm(false)} />}

      <div className="goals-page__list">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
        {goals.length === 0 && !showAddForm && <p className="goals-page__empty">No goals yet — add one to start tracking it.</p>}
      </div>
    </div>
  );
}
