"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Repeat, Store, AlertTriangle, LineChart as LineChartIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { lastMonths, monthKey, currentMonthKey } from "@/lib/finance/dates";
import { spendByCategory } from "@/lib/finance/calculations";
import { merchantStats, detectRecurring, detectAnomalies, categoryTrend, type RecurringFrequency } from "@/lib/finance/insights";
import { formatMoney } from "@/lib/finance/money";
import { CATEGORIES, categoryName, categoryColor } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { PageHeader, EmptyState, Money, CategoryDot } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Tabs, TabsList, TabsTrigger, Progress } from "@/components/ui/controls";
import { MonthlyBars, CategoryTrendLines } from "@/components/charts/trend-lines";
import { MerchantAvatar } from "@/components/transactions/merchant-avatar";

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function InsightsView() {
  const { data, ready } = useStore();
  const router = useRouter();
  const [range, setRange] = useState<3 | 6 | 12>(6);
  const [pickedCats, setPickedCats] = useState<CategoryId[]>(["groceries", "restaurants", "transportation", "shopping"]);

  const months = useMemo(() => lastMonths(range), [range]);
  const expenseTxns = useMemo(() => data.transactions.filter((t) => t.type === "expense"), [data.transactions]);

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of expenseTxns) map.set(monthKey(t.date), (map.get(monthKey(t.date)) ?? 0) + t.amount);
    return months.map((m) => ({ month: m, value: map.get(m) ?? 0 }));
  }, [expenseTxns, months]);

  const avgMonthly = monthlyTotals.length
    ? Math.round(monthlyTotals.reduce((s, m) => s + m.value, 0) / monthlyTotals.length)
    : 0;

  const trendData = useMemo(() => categoryTrend(expenseTxns, months, pickedCats), [expenseTxns, months, pickedCats]);

  const rangeTxns = useMemo(() => expenseTxns.filter((t) => months.includes(monthKey(t.date))), [expenseTxns, months]);
  const topCategories = useMemo(() => spendByCategory(rangeTxns), [rangeTxns]);
  const topMerchants = useMemo(() => merchantStats(rangeTxns, 8), [rangeTxns]);
  const recurring = useMemo(() => detectRecurring(data.transactions), [data.transactions]);
  const anomalies = useMemo(() => detectAnomalies(expenseTxns, currentMonthKey()), [expenseTxns]);

  const recurringAnnual = recurring.reduce((s, r) => s + r.estimatedAnnual, 0);

  if (ready && data.transactions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Insights" />
        <EmptyState icon={LineChartIcon} title="Insights arrive with your data" description="Add or import a few weeks of transactions and this page will show trends, recurring costs, and spending patterns." />
      </div>
    );
  }

  const toggleCat = (c: CategoryId) =>
    setPickedCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].slice(-5)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="Trends, recurring costs, and where your money really goes."
        actions={
          <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as 3 | 6 | 12)}>
            <TabsList>
              <TabsTrigger value="3">3M</TabsTrigger>
              <TabsTrigger value="6">6M</TabsTrigger>
              <TabsTrigger value="12">12M</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* anomalies */}
      {anomalies.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" /> Worth a look
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.map((a) => (
              <button
                key={a.categoryId}
                onClick={() => router.push(`/transactions?category=${a.categoryId}`)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-warning-soft/40 px-3 py-2.5 text-left text-[13px]"
              >
                <CategoryDot id={a.categoryId} />
                <span className="flex-1">
                  Your <strong>{categoryName(a.categoryId)}</strong> spending this month is{" "}
                  <strong>
                    {a.pctOver >= 100 ? "more than double" : `about ${Math.round(a.pctOver)}% above`}
                  </strong>{" "}
                  your recent monthly average of {formatMoney(a.average, "CAD", { showCents: false })}.
                </span>
                <Money cents={a.currentMonth} showCents={false} className="font-semibold" />
              </button>
            ))}
            <p className="px-1 pt-1 text-[11px] text-muted-foreground">
              Based on your last 3 months. This is a heads-up, not financial advice.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* spending trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" /> Monthly spending
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Averaging <Money cents={avgMonthly} showCents={false} className="font-medium text-foreground" /> per month over {range} months
          </p>
        </CardHeader>
        <CardContent>
          <MonthlyBars data={monthlyTotals} description={`Total spending per month for the last ${range} months.`} />
        </CardContent>
      </Card>

      {/* category trends */}
      <Card>
        <CardHeader>
          <CardTitle>Category trends</CardTitle>
          <p className="text-[13px] text-muted-foreground">Toggle categories to compare how they move over time.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.filter((c) => c.kind === "expense").map((c) => {
              const on = pickedCats.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCat(c.id)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                    on ? "border-transparent text-foreground" : "border-border text-muted-foreground"
                  }`}
                  style={on ? { backgroundColor: `color-mix(in oklch, ${categoryColor(c.id)} 18%, transparent)` } : undefined}
                >
                  <CategoryDot id={c.id} /> {c.name}
                </button>
              );
            })}
          </div>
          {pickedCats.length ? (
            <CategoryTrendLines data={trendData} categories={pickedCats} />
          ) : (
            <p className="py-8 text-center text-[13px] text-muted-foreground">Select at least one category.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* biggest categories */}
        <Card>
          <CardHeader>
            <CardTitle>Biggest spending categories</CardTitle>
            <p className="text-[13px] text-muted-foreground">Last {range} months</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.slice(0, 6).map((c) => (
              <div key={c.categoryId}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <CategoryDot id={c.categoryId} /> {categoryName(c.categoryId)}
                  </span>
                  <Money cents={c.amount} showCents={false} className="font-medium" />
                </div>
                <Progress
                  value={topCategories[0] ? (c.amount / topCategories[0].amount) * 100 : 0}
                  className="mt-1.5"
                  indicatorClassName=""
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* merchants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-4 text-muted-foreground" /> Top merchants
            </CardTitle>
            <p className="text-[13px] text-muted-foreground">Last {range} months</p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {topMerchants.map((m) => (
                <li key={m.merchant}>
                  <button
                    onClick={() => router.push(`/transactions?category=${m.categoryId}`)}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <MerchantAvatar name={m.merchant} className="size-7" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">{m.merchant}</span>
                      <span className="text-[11px] text-muted-foreground">{m.count} {m.count === 1 ? "transaction" : "transactions"}</span>
                    </span>
                    <Money cents={m.total} showCents={false} className="text-[13px] font-semibold" />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* recurring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="size-4 text-muted-foreground" /> Recurring expenses
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Detected {recurring.length} likely recurring charges · about{" "}
            <Money cents={recurringAnnual} showCents={false} className="font-medium text-foreground" /> a year
          </p>
        </CardHeader>
        <CardContent>
          {recurring.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Merchant</th>
                    <th className="py-2 px-3 font-medium">Frequency</th>
                    <th className="py-2 px-3 text-right font-medium">Amount</th>
                    <th className="py-2 pl-3 text-right font-medium">Est. annual</th>
                  </tr>
                </thead>
                <tbody>
                  {recurring.map((r) => (
                    <tr key={r.merchant} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2">
                          <CategoryDot id={r.categoryId} />
                          <span className="font-medium text-foreground">{r.merchant}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{FREQ_LABEL[r.frequency]}</td>
                      <td className="py-2.5 px-3 text-right"><Money cents={r.typicalAmount} /></td>
                      <td className="py-2.5 pl-3 text-right font-medium"><Money cents={r.estimatedAnnual} showCents={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              No recurring charges detected yet — we need a few months of history.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
