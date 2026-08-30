import { Link } from "react-router-dom";
import { BudgetPieChart } from "../components/BudgetPieChart";
import { CategoryCard } from "../components/CategoryCard";
import { MonthNav } from "../components/MonthNav";
import { TransactionRow } from "../components/TransactionRow";
import { mockUpcoming } from "../data/mockData";
import { useBudgetData } from "../context/BudgetDataContext";
import { daysLeftInMonth, formatMonthLabel } from "../lib/dates";
import "./Overview.css";

export function Overview() {
  const { categoriesWithSpent, transactionsForSelectedMonth, selectedMonth, isCurrentMonth, incomeForSelectedMonth } =
    useBudgetData();
  const totalSpent = categoriesWithSpent.reduce((sum, c) => sum + c.spent, 0);
  const totalLimit = categoriesWithSpent.reduce((sum, c) => sum + c.limit, 0);
  // Once income has been applied for this month (from the Paycheck tab),
  // "money left" is income minus spending — the number people actually
  // want. Before that, fall back to the category-limits total.
  const hasIncome = incomeForSelectedMonth !== undefined;
  const totalLeft = hasIncome ? incomeForSelectedMonth - totalSpent : totalLimit - totalSpent;
  const days = daysLeftInMonth();
  const recentTransactions = [...transactionsForSelectedMonth].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
  const monthLabel = formatMonthLabel(selectedMonth);

  function renderSentence() {
    const amount = <strong>€{Math.abs(totalLeft).toFixed(0)}</strong>;
    if (isCurrentMonth) {
      return totalLeft >= 0 ? (
        <>
          You have {amount} left to spend for{" "}
          <strong>
            {days} more day{days === 1 ? "" : "s"}
          </strong>{" "}
          this month.
        </>
      ) : (
        <>
          You've gone {amount} over this month's budget, with{" "}
          <strong>
            {days} day{days === 1 ? "" : "s"}
          </strong>{" "}
          left. That's okay — see what's driving it below.
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
        <BudgetPieChart categories={categoriesWithSpent} centerLabel="spent so far" centerValue={`€${totalSpent.toFixed(0)}`} />
      </section>

      <section>
        <h2>Categories</h2>
        <div className="overview__category-grid">
          {categoriesWithSpent.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      </section>

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
                <TransactionRow key={t.id} transaction={t} />
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
    </div>
  );
}
