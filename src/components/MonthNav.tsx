import { formatMonthLabel } from "../lib/dates";
import { useBudgetData } from "../context/BudgetDataContext";
import "./MonthNav.css";

/** Lets you step back to review a past month or forward to plan ahead.
 * Shared across every page whose data is month-scoped, so the same month
 * stays selected as you move between them. */
export function MonthNav() {
  const { selectedMonth, isCurrentMonth, goToPreviousMonth, goToNextMonth, goToCurrentMonth } = useBudgetData();

  return (
    <div className="month-nav">
      <button type="button" className="month-nav__arrow" onClick={goToPreviousMonth} aria-label="Previous month">
        ‹
      </button>
      <span className="month-nav__label">{formatMonthLabel(selectedMonth)}</span>
      <button type="button" className="month-nav__arrow" onClick={goToNextMonth} aria-label="Next month">
        ›
      </button>
      {!isCurrentMonth && (
        <button type="button" className="month-nav__today" onClick={goToCurrentMonth}>
          Back to this month
        </button>
      )}
    </div>
  );
}
