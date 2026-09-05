"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { spendByCategory } from "@/lib/finance/calculations";
import { categoryName } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { CategoryDonut } from "@/components/charts/category-donut";
import { Money, CategoryDot } from "@/components/shared";
import { EmptyState } from "@/components/shared";
import { PieChart } from "lucide-react";

export function CategoryBreakdown() {
  const { data, viewMonth } = useStore();
  const router = useRouter();
  const month = viewMonth;

  const rows = useMemo(() => spendByCategory(data.transactions, month), [data.transactions, month]);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  if (!rows.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by category</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={PieChart}
            title="No spending yet this month"
            description="Once you have expenses this month, your category breakdown will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <p className="text-[13px] text-muted-foreground">This month · tap a category to see its transactions</p>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
        <CategoryDonut
          data={rows.map((r) => ({ categoryId: r.categoryId, amount: r.amount }))}
          total={total}
          onSlice={(id) => router.push(`/transactions?category=${id}`)}
        />
        <ul className="space-y-1">
          {rows.slice(0, 7).map((r) => (
            <li key={r.categoryId}>
              <button
                onClick={() => router.push(`/transactions?category=${r.categoryId}`)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
              >
                <CategoryDot id={r.categoryId} className="size-2.5" />
                <span className="flex-1 truncate text-[13px] text-foreground">{categoryName(r.categoryId)}</span>
                <span className="tnum text-[12px] text-muted-foreground">{r.count}</span>
                <span className="tnum w-10 text-right text-[12px] text-muted-foreground">
                  {Math.round(r.share * 100)}%
                </span>
                <Money cents={r.amount} showCents={false} className="tnum w-20 text-right text-[13px] font-medium text-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
