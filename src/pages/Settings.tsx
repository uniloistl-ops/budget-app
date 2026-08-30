import { useSettings, type DetailLevel, type ThemeMode } from "../context/SettingsContext";
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

export function Settings() {
  const { settings, update } = useSettings();

  return (
    <div className="settings-page">
      <header>
        <h1>Settings</h1>
        <p>Make the app feel right for you. Changes save automatically.</p>
      </header>

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
    </div>
  );
}
