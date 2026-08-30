import { getBudgetStatus, getStatusColorVar } from "../config/categories";
import "./ProgressBar.css";

interface ProgressBarProps {
  spent: number;
  limit: number;
  /** Optional label announced to screen readers, e.g. "Groceries" */
  label?: string;
  /** "toward-limit" (default): close to the limit reads as a warning —
   * for budget spending, where more is worse. "toward-target": close to
   * the target reads as good progress — for goals and debt payoff, where
   * more is better. */
  direction?: "toward-limit" | "toward-target";
}

const STATUS_WORDS: Record<string, string> = {
  good: "On track",
  warning: "Getting close",
  serious: "Almost at limit",
  critical: "Over limit",
};

export function ProgressBar({ spent, limit, label, direction = "toward-limit" }: ProgressBarProps) {
  const pct = limit > 0 ? Math.min(spent / limit, 1) * 100 : 0;

  if (direction === "toward-target") {
    const roundedPct = Math.round(pct);
    const statusText = `${roundedPct}% complete`;
    return (
      <div className="progress-bar">
        <div
          className="progress-bar__track"
          role="progressbar"
          aria-valuenow={roundedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ? `${label}: ${statusText}` : statusText}
        >
          <div className="progress-bar__fill" style={{ width: `${pct}%`, background: "var(--status-good)" }} />
        </div>
        <span className="progress-bar__status" style={{ color: "var(--status-good)" }}>
          {roundedPct}%
        </span>
      </div>
    );
  }

  const status = getBudgetStatus(spent, limit);
  const color = getStatusColorVar(status);

  return (
    <div className="progress-bar">
      <div
        className="progress-bar__track"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${STATUS_WORDS[status]}` : STATUS_WORDS[status]}
      >
        <div
          className="progress-bar__fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="progress-bar__status" style={{ color }}>
        {STATUS_WORDS[status]}
      </span>
    </div>
  );
}
