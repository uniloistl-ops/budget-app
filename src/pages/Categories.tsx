import { CategoryCard } from "../components/CategoryCard";
import { useBudgetData } from "../context/BudgetDataContext";
import "./Categories.css";

export function Categories() {
  const { categoriesWithSpent, updateCategoryLimit } = useBudgetData();

  return (
    <div className="categories-page">
      <header>
        <h1>Categories</h1>
        <p>How your budget is split up. Tap "Edit" on any category to change its monthly limit.</p>
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
