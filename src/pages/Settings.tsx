import { useState } from "react";
import { useSettings, type DetailLevel, type ThemeMode } from "../context/SettingsContext";
import { daysUntil, getNextPayday } from "../lib/dates";
import type { PaydaySettings } from "../types";
import "./Settings.css";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Match my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const FONT_SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Default" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Extra large" },
];

const DETAIL_OPTIONS: { value: DetailLevel; label: string; description: string }[] = [
  { value: "minimal", label: "Minimal", description: "Just the summary and status colors." },
  { value: "detailed", label: "Detailed", description: "Show exact numbers everywhere." },
];

type PaydayMode = "none" | "fixed" | "lastWeekday";

function paydayMode(payday: PaydaySettings | null): PaydayMode {
  if (!payday) return "none";
  return payday.mode;
}

export function Settings() {
  const { settings, update } = useSettings();
  const mode = paydayMode(settings.payday);
  const [confirmingReset, setConfirmingReset] = useState(false);

  function resetAllData() {
    localStorage.removeItem("calm-budget:data");
    localStorage.removeItem("calm-budget:paycheck");
    window.location.reload();
  }

  function setMode(next: PaydayMode) {
    if (next === "none") update("payday", null);
    else if (next === "fixed") update("payday", { mode: "fixed", dayOfMonth: 25 });
    else update("payday", { mode: "lastWeekday" });
  }

  function setDayOfMonth(day: number) {
    if (settings.payday?.mode === "fixed") update("payday", { mode: "fixed", dayOfMonth: day });
  }

  return (
    <div className="settings-page">
      <header>
        <h1>Settings</h1>
        <p>Make the app feel right for you. Changes save automatically.</p>
      </header>

      <section className="card settings-page__section">
        <h2>Payday</h2>
        <p className="settings-page__hint">
          When your salary or main income arrives — the Overview counts down to it instead of to the end of the
          calendar month.
        </p>
        <div className="settings-page__options" role="radiogroup" aria-label="Payday pattern">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "none"}
            className={"settings-page__option" + (mode === "none" ? " settings-page__option--active" : "")}
            onClick={() => setMode("none")}
          >
            Not set
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "fixed"}
            className={"settings-page__option" + (mode === "fixed" ? " settings-page__option--active" : "")}
            onClick={() => setMode("fixed")}
          >
            Fixed day of month
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "lastWeekday"}
            className={"settings-page__option" + (mode === "lastWeekday" ? " settings-page__option--active" : "")}
            onClick={() => setMode("lastWeekday")}
          >
            Last working day
          </button>
        </div>

        {settings.payday?.mode === "fixed" && (
          <label className="settings-page__day-field">
            <span>Day of the month</span>
            <input
              type="number"
              min={1}
              max={31}
              value={settings.payday.dayOfMonth}
              onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
        )}

        {settings.payday?.mode === "lastWeekday" && (
          <p className="settings-page__hint">
            The last Monday–Friday of each month. This doesn't know about public holidays, only weekends.
          </p>
        )}

        {settings.payday &&
          (() => {
            const next = getNextPayday(settings.payday);
            const days = daysUntil(next);
            return (
              <p className="settings-page__payday-preview">
                Next payday: <strong>{next.toLocaleDateString(undefined, { day: "numeric", month: "long" })}</strong>{" "}
                — {days === 0 ? "today" : days === 1 ? "in 1 day" : `in ${days} days`}
              </p>
            );
          })()}
      </section>

      <section className="card settings-page__section">
        <h2>Theme</h2>
        <p className="settings-page__hint">A genuine dark mode with the same soft, calm contrast — not just inverted colors.</p>
        <div className="settings-page__options" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={settings.theme === opt.value}
              className={"settings-page__option" + (settings.theme === opt.value ? " settings-page__option--active" : "")}
              onClick={() => update("theme", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-page__section">
        <h2>Motion</h2>
        <p className="settings-page__hint">Turn off transitions and animations entirely if movement is distracting.</p>
        <label className="settings-page__toggle">
          <input
            type="checkbox"
            checked={settings.animations}
            onChange={(e) => update("animations", e.target.checked)}
          />
          Animations on
        </label>
      </section>

      <section className="card settings-page__section">
        <h2>Text size</h2>
        <div className="settings-page__options" role="radiogroup" aria-label="Text size">
          {FONT_SCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={settings.fontScale === opt.value}
              className={
                "settings-page__option" + (settings.fontScale === opt.value ? " settings-page__option--active" : "")
              }
              onClick={() => update("fontScale", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-page__section">
        <h2>Detail level</h2>
        <p className="settings-page__hint">How much is shown by default before you tap to see more.</p>
        <div className="settings-page__options" role="radiogroup" aria-label="Detail level">
          {DETAIL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={settings.detailLevel === opt.value}
              className={
                "settings-page__option" + (settings.detailLevel === opt.value ? " settings-page__option--active" : "")
              }
              onClick={() => update("detailLevel", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-page__section">
        <h2>Data</h2>
        <p className="settings-page__hint">
          Everything you enter lives only in this browser — categories, transactions, goals, debts, income, and your
          Paycheck numbers.
        </p>
        {confirmingReset ? (
          <div className="settings-page__reset-confirm">
            <span>This clears everything and starts fresh. It can't be undone.</span>
            <div className="settings-page__reset-actions">
              <button type="button" className="settings-page__reset-confirm-btn" onClick={resetAllData}>
                Yes, reset everything
              </button>
              <button type="button" className="settings-page__reset-cancel-btn" onClick={() => setConfirmingReset(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="settings-page__reset-btn" onClick={() => setConfirmingReset(true)}>
            Reset all data
          </button>
        )}
      </section>
    </div>
  );
}
