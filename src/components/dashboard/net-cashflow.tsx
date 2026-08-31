"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { summarize, pctChange } from "@/lib/finance/calculations";
import { currentMonthKey, addMonths, monthLabel } from "@/lib/finance/dates";
import { Card } from "@/components/ui/primitives";
import { Money, TrendPill } from "@/components/shared";

export function NetCashflow() {
  const { data } = useStore();
  const month = currentMonthKey();

  const { current, prev } = useMemo(() => {
    return {
      current: summarize(data.transactions, month),
      prev: summarize(data.transactions, addMonths(month, -1)),
    };
  }, [data.transactions, month]);

  const netChange = pctChange(current.net, prev.net);

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-px bg-border sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="bg-surface p-5">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Net cash flow · {monthLabel(month, { month: "long" })}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <Money
              cents={current.net}
              signed
              showCents={false}
              className={`text-[2rem] font-semibold leading-none tracking-tight ${
                current.net >= 0 ? "text-foreground" : "text-negative"
              }`}
            />
          </div>
          <div className="mt-2">
            <TrendPill pct={netChange} suffix="vs last month" />
          </div>
        </div>
        <div className="bg-surface p-5">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Income</p>
          <Money cents={current.income} showCents={false} className="mt-2 block text-xl font-semibold text-positive" />
          <TrendPill pct={pctChange(current.income, prev.income)} suffix="" className="mt-1" />
        </div>
        <div className="bg-surface p-5">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Expenses</p>
          <Money cents={current.expenses} showCents={false} className="mt-2 block text-xl font-semibold text-foreground" />
          <TrendPill pct={pctChange(current.expenses, prev.expenses)} suffix="" invert className="mt-1" />
        </div>
      </div>
    </Card>
  );
}
