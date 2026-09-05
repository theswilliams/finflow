"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthLabel } from "@/lib/finance/dates";
import { categoryColor, categoryName } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { ChartFrame, MoneyTooltip, axisTickStyle, moneyTicks, compactMoneyTick, CHART_GRID, CHART_NEUTRAL, useChartAnimation } from "./chart-kit";

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
  const { domain, ticks } = moneyTicks(data.map((d) => d.value));
  return (
    <ChartFrame height={height} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={axisTickStyle} tickLine={false} axisLine={false} tickFormatter={(v: string) => monthLabel(v, { month: "short" })} />
          <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={52} domain={domain} ticks={ticks} tickFormatter={compactMoneyTick} />
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
  const allValues = data.flatMap((row) => categories.map((c) => Number(row[c]) || 0));
  const { domain, ticks } = moneyTicks(allValues);
  return (
    <ChartFrame height={height} description={`Line chart of monthly spending for ${categories.map(categoryName).join(", ")}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={axisTickStyle} tickLine={false} axisLine={false} tickFormatter={(v: string) => monthLabel(v, { month: "short" })} />
          <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={52} domain={domain} ticks={ticks} tickFormatter={compactMoneyTick} />
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
