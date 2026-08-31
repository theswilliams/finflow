"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/finance/money";
import { formatDate } from "@/lib/finance/dates";
import { ChartFrame, MoneyTooltip, axisTickStyle, CHART_GRID, CHART_NEUTRAL } from "./chart-kit";

export interface SpendingPoint {
  label: string; // x value (iso date or bucket label)
  value: number; // cents
}

export function SpendingAreaChart({
  data,
  height = 260,
  xIsDate = true,
  description,
}: {
  data: SpendingPoint[];
  height?: number;
  xIsDate?: boolean;
  description?: string;
}) {
  return (
    <ChartFrame height={height} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_NEUTRAL} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART_NEUTRAL} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTickStyle}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickFormatter={(v: string) => (xIsDate ? formatDate(v, { month: "short", day: "numeric" }) : v)}
          />
          <YAxis
            tick={axisTickStyle}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => formatMoney(v, "CAD", { showCents: false, compact: true })}
          />
          <Tooltip
            content={
              <MoneyTooltip
                labelFormatter={(v) => (xIsDate ? formatDate(String(v), { month: "long", day: "numeric" }) : String(v))}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Spending"
            stroke={CHART_NEUTRAL}
            strokeWidth={2}
            fill="url(#spendFill)"
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
