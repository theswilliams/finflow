"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { budgetStatus } from "@/lib/finance/calculations";
import { currentMonthKey } from "@/lib/finance/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { BudgetBar } from "@/components/budgets/budget-bar";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";

export function BudgetProgress() {
  const { data } = useStore();
  const router = useRouter();
  const month = currentMonthKey();

  const statuses = useMemo(
    () =>
      data.budgets
        .map((b) => budgetStatus(b, data.transactions, month))
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 5),
    [data.budgets, data.transactions, month],
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Budget progress</CardTitle>
        <Link
          href="/budgets"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Manage <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {statuses.length ? (
          statuses.map((s) => (
            <BudgetBar key={s.budget.id} status={s} onClick={() => router.push(`/transactions?category=${s.budget.categoryId}`)} />
          ))
        ) : (
          <EmptyState
            icon={Wallet}
            title="Give your money a plan"
            description="Create a monthly budget for your key categories and track progress at a glance."
            action={
              <Button size="sm" onClick={() => router.push("/budgets")}>
                Create a budget
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
