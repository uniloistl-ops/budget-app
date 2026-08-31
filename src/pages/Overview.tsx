import { useState } from "react";
import { Link } from "react-router-dom";
import { BudgetPieChart, type PieSlice } from "../components/BudgetPieChart";
import { CategoryCard } from "../components/CategoryCard";
import { MonthNav } from "../components/MonthNav";
import { TransactionRow } from "../components/TransactionRow";
import { mockUpcoming } from "../data/mockData";
import { useBudgetData } from "../context/BudgetDataContext";
import { useSettings } from "../context/SettingsContext";
import { daysLeftInMonth, daysUntil, formatMonthLabel, getNextPayday } from "../lib/dates";
import "./Overview.css";

type ChartView = "category" | "type";

export function Overview() {
  const { categories, categoriesWithSpent, transactionsForSelectedMonth, selectedMonth, isCurrentMonth, incomeForSelectedMonth, debts } =
    useBudgetData();
  const { settings } = useSettings();
  const [chartView, setChartView] = useState<ChartView>("category");
  const totalSpent = categoriesWithSpent.reduce((sum, c) => sum + c.spent, 0);
  const totalLimit = categoriesWithSpent.reduce((sum, c) => sum + c.limit, 0);
  const fixedCategories = categoriesWithSpent.filter((c) => c.type === "fixed");
  const variableCategories = categoriesWithSpent.filter((c) => c.type === "variable");
  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);

  const chartSlices: PieSlice[] =
    chartView === "category"
      ? categoriesWithSpent
      : [
          {
            id: "fixed",
            label: "Fixed costs",
            spent: fixedCategories.reduce((sum, c) => sum + c.spent, 0),
            colorVar: "--group-fixed",
          },
          {
            id: "variable",
            label: "Variable costs",
            spent: variableCategories.reduce((sum, c) => sum + c.spent, 0),
            colorVar: "--group-variable",
          },
        ];
  // Once income has been applied for this month (from the Paycheck tab),
  // "money left" is income minus spending — the number people actually
  // want. Before that, fall back to the category-limits total.
  const hasIncome = incomeForSelectedMonth !== undefined;
  const totalLeft = hasIncome ? incomeForSelectedMonth - totalSpent : totalLimit - totalSpent;

  // When a payday is configured, the budgeting cycle runs payday-to-payday
  // rather than calendar-month-to-month — so "days remaining" counts down
  // to it instead of to month-end (only meaningful while viewing the
  // current month; browsing a past/future month keeps the calendar framing).
  const nextPayday = settings.payday ? getNextPayday(settings.payday) : null;
  const daysUntilPayday = nextPayday ? daysUntil(nextPayday) : null;
  const usingPayday = isCurrentMonth && daysUntilPayday !== null;
  const days = usingPayday ? daysUntilPayday : daysLeftInMonth();
  const dailyAllowance = usingPayday && days > 0 && totalLeft > 0 ? totalLeft / days : null;

  const recentTransactions = [...transactionsForSelectedMonth].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
  const monthLabel = formatMonthLabel(selectedMonth);

  function renderSentence() {
    const amount = <strong>€{Math.abs(totalLeft).toFixed(0)}</strong>;
    if (isCurrentMonth) {
      const dayPhrase = usingPayday ? "until payday" : "this month";
      return totalLeft >= 0 ? (
        <>
          You have {amount} left to spend for{" "}
          <strong>
            {days} more day{days === 1 ? "" : "s"}
          </strong>{" "}
          {dayPhrase}.
        </>
      ) : (
        <>
          You've gone {amount} over budget, with{" "}
          <strong>
            {days} day{days === 1 ? "" : "s"}
          </strong>{" "}
          left {dayPhrase}. That's okay — see what's driving it below.
        </>
      );
    }
    // Past or future month: no "days left" framing, and past tense vs. projection.
    return totalLeft >= 0 ? (
      <>
        {isFuture(selectedMonth) ? "You're projected to have" : "You had"} {amount} left in {monthLabel}.
      </>
    ) : (
      <>
        {isFuture(selectedMonth) ? "You're projected to go" : "You went"} {amount} over budget in {monthLabel}.
      </>
    );
  }

  function isFuture(month: string): boolean {
    return month > new Date().toISOString().slice(0, 7);
  }

  return (
    <div className="overview">
      <header className="overview__header">
        <div>
          <h1>Overview</h1>
          <MonthNav />
          <p className="overview__sentence">{renderSentence()}</p>
          {dailyAllowance !== null && (
            <p className="overview__daily-line">
              That's about <strong>€{dailyAllowance.toFixed(0)}</strong> a day until payday.
            </p>
          )}
          {hasIncome && (
            <p className="overview__income-line">
              Income for {monthLabel}: <strong>€{incomeForSelectedMonth.toFixed(0)}</strong>
            </p>
          )}
          {!hasIncome && (
            <p className="overview__income-hint">
              No income set for {monthLabel} yet — <Link to="/paycheck">calculate and apply it</Link> to see your
              real money left.
            </p>
          )}
        </div>
        <Link to="/transactions" className="overview__cta">
          + Log a transaction
        </Link>
      </header>

      <section className="card overview__chart-card">
        <div className="overview__chart-toolbar">
          {usingPayday ? (
            <div className="overview__payday-badge">
              {daysUntilPayday === 0 ? "Payday today" : `Payday in ${daysUntilPayday} day${daysUntilPayday === 1 ? "" : "s"}`}
            </div>
          ) : (
            <span />
          )}
          <div className="overview__chart-toggle" role="radiogroup" aria-label="Chart grouping">
            <button
              type="button"
              role="radio"
              aria-checked={chartView === "category"}
              className={"overview__chart-toggle-btn" + (chartView === "category" ? " overview__chart-toggle-btn--active" : "")}
              onClick={() => setChartView("category")}
            >
              By category
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={chartView === "type"}
              className={"overview__chart-toggle-btn" + (chartView === "type" ? " overview__chart-toggle-btn--active" : "")}
              onClick={() => setChartView("type")}
            >
              Fixed vs. variable
            </button>
          </div>
        </div>
        <BudgetPieChart slices={chartSlices} centerLabel="spent so far" centerValue={`€${totalSpent.toFixed(0)}`} />
      </section>

      {fixedCategories.length > 0 && (
        <section>
          <h2>Fixed costs</h2>
          <div className="overview__category-grid">
            {fixedCategories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </section>
      )}

      {variableCategories.length > 0 && (
        <section>
          <h2>Variable costs</h2>
          <div className="overview__category-grid">
            {variableCategories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </section>
      )}

      <div className="overview__two-col">
        <section className="card">
          <h2>Coming up</h2>
          <p className="overview__hint">Recurring expenses expected soon, so nothing catches you off guard.</p>
          <ul className="overview__upcoming-list">
            {mockUpcoming.map((u) => (
              <li key={u.id} className="overview__upcoming-item">
                <span>{u.label}</span>
                <span className="overview__upcoming-amount">€{u.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>{isCurrentMonth ? "Recent transactions" : `Transactions in ${monthLabel}`}</h2>
          {recentTransactions.length > 0 ? (
            <div>
              {recentTransactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} categories={categories} />
              ))}
            </div>
          ) : (
            <p className="overview__hint">No transactions logged for {monthLabel} yet.</p>
          )}
          <Link to="/transactions" className="overview__see-all">
            See all transactions
          </Link>
        </section>
      </div>

      {debts.length > 0 && (
        <section className="card overview__debt-card">
          <h2>Debt</h2>
          <p className="overview__debt-total">
            You owe <strong>€{totalDebt.toFixed(0)}</strong> across {debts.length} debt{debts.length === 1 ? "" : "s"}.
          </p>
          <Link to="/categories" className="overview__see-all">
            Manage debts
          </Link>
        </section>
      )}
    </div>
  );
}
