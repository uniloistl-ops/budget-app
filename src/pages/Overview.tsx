import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BudgetPieChart, type PieSlice } from "../components/BudgetPieChart";
import { CardMenu } from "../components/CardMenu";
import { CategoryCard } from "../components/CategoryCard";
import { MonthNav } from "../components/MonthNav";
import { TransactionRow } from "../components/TransactionRow";
import { mockUpcoming } from "../data/mockData";
import { useBudgetData } from "../context/BudgetDataContext";
import { useSettings } from "../context/SettingsContext";
import { daysLeftInMonth, daysUntil, formatMonthLabel, getNextPayday } from "../lib/dates";
import type { IncomeSource } from "../types";
import "./Overview.css";

type ChartView = "category" | "type";

function AddIncomeSourceForm({ onClose }: { onClose: () => void }) {
  const { addIncomeSource } = useBudgetData();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!label.trim() || !Number.isFinite(value) || value <= 0) return;
    addIncomeSource({ label: label.trim(), amount: value });
    onClose();
  }

  return (
    <form className="card overview__income-add-form" onSubmit={submit}>
      <div className="overview__income-add-grid">
        <label className="overview__income-add-field">
          <span>Source</span>
          <input
            type="text"
            placeholder="e.g. Freelance, gift, refund"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </label>
        <label className="overview__income-add-field">
          <span>Amount</span>
          <div className="overview__income-add-euro">
            <span>€</span>
            <input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </label>
      </div>
      <div className="overview__income-add-actions">
        <button type="submit" className="overview__income-add-submit">
          Add
        </button>
        <button type="button" className="overview__income-add-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function IncomeSourceRow({ source }: { source: IncomeSource }) {
  const { updateIncomeSource, deleteIncomeSource } = useBudgetData();
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(source.label);
  const [draftAmount, setDraftAmount] = useState(String(source.amount));
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function save() {
    const value = Number(draftAmount);
    if (!draftLabel.trim() || !Number.isFinite(value) || value <= 0) return;
    updateIncomeSource(source.id, { label: draftLabel.trim(), amount: value });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="overview__income-row overview__income-row--editing">
        <input
          type="text"
          className="overview__income-row-text"
          value={draftLabel}
          autoFocus
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <div className="overview__income-row-euro">
          <span>€</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={draftAmount}
            onChange={(e) => setDraftAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        </div>
        <div className="overview__income-row-actions">
          <button type="button" className="overview__income-row-save" onClick={save}>
            Save
          </button>
          <button type="button" className="overview__income-row-cancel" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overview__income-row">
      <span className="overview__income-row-label">{source.label}</span>
      {confirmingDelete ? (
        <div className="overview__income-row-confirm">
          <span>Delete?</span>
          <button type="button" className="overview__income-row-confirm-yes" onClick={() => deleteIncomeSource(source.id)}>
            Yes
          </button>
          <button type="button" className="overview__income-row-confirm-no" onClick={() => setConfirmingDelete(false)}>
            No
          </button>
        </div>
      ) : (
        <>
          <span className="overview__income-row-amount">€{source.amount.toFixed(2)}</span>
          <CardMenu
            label={`${source.label} actions`}
            items={[
              { label: "Edit", onClick: () => setEditing(true) },
              { label: "Delete", onClick: () => setConfirmingDelete(true), destructive: true },
            ]}
          />
        </>
      )}
    </div>
  );
}

export function Overview() {
  const {
    categories,
    categoriesWithSpent,
    transactionsForSelectedMonth,
    selectedMonth,
    isCurrentMonth,
    incomeSourcesForSelectedMonth,
    incomeForSelectedMonth,
    debts,
  } = useBudgetData();
  const { settings } = useSettings();
  const [chartView, setChartView] = useState<ChartView>("category");
  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);
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
  // Once income has been added for this month (paycheck and/or other
  // sources), "money left" is income minus spending — the number people
  // actually want. Before that, fall back to the category-limits total.
  const hasIncome = incomeForSelectedMonth !== undefined;
  const totalLeft = hasIncome ? incomeForSelectedMonth - totalSpent : totalLimit - totalSpent;
  const spendingLessThanEarning = hasIncome ? totalSpent <= incomeForSelectedMonth : null;

  // When a payday is configured, the budgeting cycle runs payday-to-payday
  // rather than calendar-month-to-month — so "days remaining" counts down
  // to it instead of to month-end (only meaningful while viewing the
  // current month; browsing a past/future month keeps the calendar framing).
  const nextPayday = settings.payday ? getNextPayday(settings.payday) : null;
  const daysUntilPayday = nextPayday ? daysUntil(nextPayday) : null;
  const usingPayday = isCurrentMonth && daysUntilPayday !== null;
  const days = usingPayday ? daysUntilPayday : daysLeftInMonth();
  const dailyAllowance = isCurrentMonth && days > 0 && totalLeft > 0 ? totalLeft / days : null;

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
              That's about <strong>€{dailyAllowance.toFixed(0)}</strong> a day {usingPayday ? "until payday" : "for the rest of the month"}.
            </p>
          )}
        </div>
        <Link to="/transactions" className="overview__cta">
          + Log a transaction
        </Link>
      </header>

      <section className="card overview__income-card">
        <div className="overview__income-header">
          <div>
            <h2>Income</h2>
            <p className="overview__hint">Where your money comes from this month — your paycheck, plus anything else.</p>
          </div>
          {!showAddIncomeForm && (
            <button type="button" className="overview__income-add-link" onClick={() => setShowAddIncomeForm(true)}>
              + Add income
            </button>
          )}
        </div>

        {showAddIncomeForm && <AddIncomeSourceForm onClose={() => setShowAddIncomeForm(false)} />}

        {incomeSourcesForSelectedMonth.length > 0 ? (
          <div className="overview__income-list">
            {incomeSourcesForSelectedMonth.map((s) => (
              <IncomeSourceRow key={s.id} source={s} />
            ))}
          </div>
        ) : (
          !showAddIncomeForm && (
            <p className="overview__hint">
              No income added yet — <Link to="/paycheck">calculate your paycheck</Link> or add another source above.
            </p>
          )
        )}

        {hasIncome && (
          <>
            <div className="overview__income-total">
              <span>Total income</span>
              <strong>€{incomeForSelectedMonth.toFixed(0)}</strong>
            </div>
            <div className="overview__income-vs-spend-bar">
              <div
                className="overview__income-vs-spend-fill"
                style={{
                  width: `${Math.min(100, (totalSpent / incomeForSelectedMonth) * 100)}%`,
                  background: spendingLessThanEarning ? "var(--status-good)" : "var(--status-critical)",
                }}
              />
            </div>
            <p className="overview__income-vs-spend-sentence">
              {spendingLessThanEarning ? (
                <>You're spending <strong className="overview__good-text">less</strong> than you earn this month.</>
              ) : (
                <>You're spending <strong className="overview__critical-text">more</strong> than you earn this month.</>
              )}
            </p>
          </>
        )}
      </section>

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
          {mockUpcoming.length > 0 ? (
            <ul className="overview__upcoming-list">
              {mockUpcoming.map((u) => (
                <li key={u.id} className="overview__upcoming-item">
                  <span>{u.label}</span>
                  <span className="overview__upcoming-amount">€{u.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="overview__hint">Nothing set up here yet.</p>
          )}
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
