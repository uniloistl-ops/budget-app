import { CategoryCard } from "../components/CategoryCard";
import { MonthNav } from "../components/MonthNav";
import { useBudgetData } from "../context/BudgetDataContext";
import { formatMonthLabel } from "../lib/dates";
import "./Categories.css";

export function Categories() {
  const { categoriesWithSpent, updateCategoryLimit, selectedMonth } = useBudgetData();

  return (
    <div className="categories-page">
      <header className="categories-page__header">
        <div>
          <h1>Categories</h1>
          <p>
            Spending shown is for {formatMonthLabel(selectedMonth)}. Limits apply every month — tap "Edit" to change
            one.
          </p>
        </div>
        <MonthNav />
      </header>

      <div className="categories-page__grid">
        {categoriesWithSpent.map((c) => (
          <CategoryCard key={c.id} category={c} onEditLimit={(limit) => updateCategoryLimit(c.id, limit)} />
        ))}
      </div>

      <p className="categories-page__note">Custom category colors are coming in a future step.</p>
    </div>
  );
}
