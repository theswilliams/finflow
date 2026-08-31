"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/finance/money";
import { categoryColor, categoryName } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { ChartFrame, useChartAnimation } from "./chart-kit";

export interface DonutSlice {
  categoryId: CategoryId;
  amount: number;
}

export function CategoryDonut({
  data,
  total,
  height = 220,
  onSlice,
  activeCategory,
}: {
  data: DonutSlice[];
  total: number;
  height?: number;
  onSlice?: (id: CategoryId) => void;
  activeCategory?: CategoryId | null;
}) {
  const anim = useChartAnimation();
  const desc = `Donut chart of spending by category. Total ${formatMoney(total)}. ${data
    .map((d) => `${categoryName(d.categoryId)} ${formatMoney(d.amount)}`)
    .join(", ")}.`;

  return (
    <ChartFrame height={height} description={desc}>
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as DonutSlice;
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-pop)]">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: categoryColor(p.categoryId) }} />
                      <span className="font-medium">{categoryName(p.categoryId)}</span>
                    </div>
                    <p className="tnum mt-1 text-muted-foreground">
                      {formatMoney(p.amount)} · {total ? Math.round((p.amount / total) * 100) : 0}%
                    </p>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="categoryId"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={1.5}
              stroke="var(--color-surface)"
              strokeWidth={2}
              {...anim}
              onClick={(d) => onSlice?.((d as unknown as DonutSlice).categoryId)}
            >
              {data.map((d) => (
                <Cell
                  key={d.categoryId}
                  fill={categoryColor(d.categoryId)}
                  opacity={activeCategory && activeCategory !== d.categoryId ? 0.3 : 1}
                  cursor={onSlice ? "pointer" : undefined}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Spent</span>
          <span className="tnum text-lg font-semibold text-foreground">
            {formatMoney(total, "CAD", { showCents: false })}
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}
