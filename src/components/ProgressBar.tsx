import { getBudgetStatus, getStatusColorVar } from "../config/categories";
import "./ProgressBar.css";

interface ProgressBarProps {
  spent: number;
  limit: number;
  /** Optional label announced to screen readers, e.g. "Groceries" */
  label?: string;
}

const STATUS_WORDS: Record<string, string> = {
  good: "On track",
  warning: "Getting close",
  serious: "Almost at limit",
  critical: "Over limit",
};

export function ProgressBar({ spent, limit, label }: ProgressBarProps) {
  const status = getBudgetStatus(spent, limit);
  const pct = limit > 0 ? Math.min(spent / limit, 1) * 100 : 0;
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
