"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance/money";

export const CHART_GRID = "var(--color-border)";
export const CHART_AXIS = "var(--color-muted-foreground)";
export const CHART_NEUTRAL = "var(--color-info)";
export const CHART_POSITIVE = "var(--color-positive)";
export const CHART_NEGATIVE = "var(--color-negative)";

export const axisTickStyle = { fill: CHART_AXIS, fontSize: 11 } as const;

export function ChartFrame({
  children,
  className,
  height = 260,
  description,
}: {
  children: React.ReactNode;
  className?: string;
  height?: number;
  /** screen-reader summary of the chart */
  description?: string;
}) {
  return (
    <figure className={cn("w-full", className)} style={{ height }}>
      {description ? <figcaption className="sr-only">{description}</figcaption> : null}
      {children}
    </figure>
  );
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export function MoneyTooltip({
  active,
  payload,
  label,
  labelFormatter,
  hideZero = false,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (v: string | number) => string;
  hideZero?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => !hideZero || (typeof p.value === "number" && p.value !== 0));
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-[var(--shadow-pop)]">
      {label !== undefined ? (
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            {r.color ? (
              <span className="size-2 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
            ) : null}
            <span className="text-muted-foreground">{r.name}</span>
            <span className="tnum ml-auto font-medium text-foreground">
              {typeof r.value === "number" ? formatMoney(r.value) : r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
