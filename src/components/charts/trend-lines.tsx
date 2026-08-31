"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/finance/money";
import { monthLabel } from "@/lib/finance/dates";
import { categoryColor, categoryName } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { ChartFrame, MoneyTooltip, axisTickStyle, CHART_GRID, CHART_NEUTRAL, useChartAnimation } from "./chart-kit";

export function MonthlyBars({
  data,
  height = 260,
  description,
}: {
  data: { month: string; value: number }[];
  height?: number;
  description?: string;
}) {
  const anim = useChartAnimation();
  return (
    <ChartFrame height={height} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={axisTickStyle} tickLine={false} axisLine={false} tickFormatter={(v: string) => monthLabel(v, { month: "short" })} />
          <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatMoney(v, "CAD", { showCents: false, compact: true })} />
          <Tooltip cursor={{ fill: "var(--color-surface-muted)" }} content={<MoneyTooltip labelFormatter={(v) => monthLabel(String(v))} />} />
          <Bar dataKey="value" name="Spending" fill={CHART_NEUTRAL} radius={[4, 4, 0, 0]} maxBarSize={44} {...anim} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function CategoryTrendLines({
  data,
  categories,
  height = 300,
}: {
  data: Record<string, number | string>[];
  categories: CategoryId[];
  height?: number;
}) {
  const anim = useChartAnimation();
  return (
    <ChartFrame height={height} description={`Line chart of monthly spending for ${categories.map(categoryName).join(", ")}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={axisTickStyle} tickLine={false} axisLine={false} tickFormatter={(v: string) => monthLabel(v, { month: "short" })} />
          <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatMoney(v, "CAD", { showCents: false, compact: true })} />
          <Tooltip content={<MoneyTooltip labelFormatter={(v) => monthLabel(String(v))} hideZero />} />
          {categories.map((c) => (
            <Line
              key={c}
              type="monotone"
              dataKey={c}
              name={categoryName(c)}
              stroke={categoryColor(c)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              {...anim}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
