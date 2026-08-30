import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryId, CategoryWithSpent } from "../types";
import { getCategoryHex } from "../config/categories";
import { useSettings } from "../context/SettingsContext";
import "./BudgetPieChart.css";

interface BudgetPieChartProps {
  categories: CategoryWithSpent[];
  /** Big number shown in the donut's center. */
  centerLabel: string;
  centerValue: string;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { label: string; spent: number };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="budget-pie__tooltip">
      <strong>{item.label}</strong>
      <span>€{item.spent.toFixed(0)} spent</span>
    </div>
  );
}

export function BudgetPieChart({ categories, centerLabel, centerValue }: BudgetPieChartProps) {
  const { resolvedTheme, settings } = useSettings();
  const data: { id: CategoryId; label: string; spent: number; value: number; colorVar: string }[] = categories.map(
    (c) => ({
      id: c.id,
      label: c.label,
      spent: c.spent,
      colorVar: c.colorVar,
      value: Math.max(c.spent, 0.01), // keep zero-spend slices from disappearing entirely
    })
  );

  // With more categories (especially once one dominates, like Rent), fixed
  // padding/rounding makes the thin remaining slices look like disconnected
  // blobs rather than a ring — so both scale down as the slice count grows.
  const sliceCount = data.length;
  const paddingAngle = sliceCount > 6 ? 1.2 : sliceCount > 4 ? 2 : 3;
  const cornerRadius = sliceCount > 6 ? 2 : sliceCount > 4 ? 4 : 6;

  return (
    <div className="budget-pie">
      <div className="budget-pie__chart">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={78}
              outerRadius={110}
              paddingAngle={paddingAngle}
              cornerRadius={cornerRadius}
              stroke="none"
              isAnimationActive={settings.animations}
              animationDuration={500}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={getCategoryHex(entry.colorVar, resolvedTheme)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="budget-pie__center">
          <span className="budget-pie__center-value">{centerValue}</span>
          <span className="budget-pie__center-label">{centerLabel}</span>
        </div>
      </div>

      <ul className="budget-pie__legend">
        {categories.map((c) => (
          <li key={c.id} className="budget-pie__legend-item">
            <span
              className="budget-pie__legend-dot"
              style={{ background: getCategoryHex(c.colorVar, resolvedTheme) }}
              aria-hidden="true"
            />
            <span className="budget-pie__legend-label">{c.label}</span>
            <span className="budget-pie__legend-amount">€{c.spent.toFixed(0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
