import { Link } from "react-router-dom";
import { BudgetPieChart } from "../components/BudgetPieChart";
import { CategoryCard } from "../components/CategoryCard";
import { TransactionRow } from "../components/TransactionRow";
import { mockUpcoming } from "../data/mockData";
import { useBudgetData } from "../context/BudgetDataContext";
import { daysLeftInMonth } from "../lib/dates";
import "./Overview.css";

export function Overview() {
  const { categoriesWithSpent, transactions } = useBudgetData();
  const totalSpent = categoriesWithSpent.reduce((sum, c) => sum + c.spent, 0);
  const totalLimit = categoriesWithSpent.reduce((sum, c) => sum + c.limit, 0);
  const totalLeft = totalLimit - totalSpent;
  const days = daysLeftInMonth();
  const recentTransactions = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);

  return (
    <div className="overview">
      <header className="overview__header">
        <div>
          <h1>Overview</h1>
          <p className="overview__sentence">
            {totalLeft >= 0 ? (
              <>
                You have <strong>€{totalLeft.toFixed(0)}</strong> left to spend for{" "}
                <strong>
                  {days} more day{days === 1 ? "" : "s"}
                </strong>{" "}
                this month.
              </>
            ) : (
              <>
                You've gone <strong>€{Math.abs(totalLeft).toFixed(0)}</strong> over this month's budget, with{" "}
                <strong>
                  {days} day{days === 1 ? "" : "s"}
                </strong>{" "}
                left. That's okay — see what's driving it below.
              </>
            )}
          </p>
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
          <h2>Recent transactions</h2>
          <div>
            {recentTransactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
          <Link to="/transactions" className="overview__see-all">
            See all transactions
          </Link>
        </section>
      </div>
    </div>
  );
}
