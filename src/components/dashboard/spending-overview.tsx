"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dailySpend } from "@/lib/finance/calculations";
import { currentMonthKey, monthKey } from "@/lib/finance/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/controls";
import { SpendingAreaChart, type SpendingPoint } from "@/components/charts/spending-area";
import { Money } from "@/components/shared";
import { formatMoney } from "@/lib/finance/money";

type Grain = "daily" | "weekly" | "monthly";

export function SpendingOverview() {
  const { data } = useStore();
  const [grain, setGrain] = useState<Grain>("daily");
  const month = currentMonthKey();

  const { points, total } = useMemo(() => {
    const monthTxns = data.transactions.filter((t) => t.type === "expense" && monthKey(t.date) === month);
    const total = monthTxns.reduce((s, t) => s + t.amount, 0);

    if (grain === "daily") {
      const pts: SpendingPoint[] = dailySpend(data.transactions, month).map((d) => ({ label: d.date, value: d.spent }));
      return { points: pts, total };
    }
    if (grain === "weekly") {
      const buckets = new Map<string, number>();
      for (const t of monthTxns) {
        const day = Number(t.date.slice(8, 10));
        const week = `Week ${Math.min(5, Math.ceil(day / 7))}`;
        buckets.set(week, (buckets.get(week) ?? 0) + t.amount);
      }
      const pts = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]
        .filter((w) => buckets.has(w))
        .map((w) => ({ label: w, value: buckets.get(w) ?? 0 }));
      return { points: pts, total };
    }
    // monthly: last 6 months
    const buckets = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.type !== "expense") continue;
      const k = monthKey(t.date);
      buckets.set(k, (buckets.get(k) ?? 0) + t.amount);
    }
    const keys = [...buckets.keys()].sort().slice(-6);
    const pts = keys.map((k) => ({ label: k.slice(5) + "/" + k.slice(2, 4), value: buckets.get(k) ?? 0 }));
    return { points: pts, total: buckets.get(month) ?? 0 };
  }, [data.transactions, grain, month]);

  const avgPerDay = points.length ? total / new Date().getDate() : 0;

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Spending overview</CardTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <Money cents={total} showCents={false} className="font-medium text-foreground" /> this month
            {grain === "daily" && (
              <> · {formatMoney(avgPerDay, "CAD", { showCents: false })}/day avg</>
            )}
          </p>
        </div>
        <Tabs value={grain} onValueChange={(v) => setGrain(v as Grain)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <SpendingAreaChart
          data={points}
          xIsDate={grain === "daily"}
          description={`Spending ${grain} for the current period, totalling ${formatMoney(total)}.`}
        />
      </CardContent>
    </Card>
  );
}
