"use client";

import Link from "next/link";
import { Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { AddTransactionButton } from "@/components/transactions/add-transaction";
import { NetCashflow } from "./net-cashflow";
import { AccountBalances } from "./account-balances";
import { SpendingOverview } from "./spending-overview";
import { CategoryBreakdown } from "./category-breakdown";
import { BudgetProgress } from "./budget-progress";
import { RecentTransactions } from "./recent-transactions";
import { currentMonthKey, monthLabel } from "@/lib/finance/dates";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const { data, ready, resetDemo } = useStore();

  if (!ready) return <DashboardSkeleton />;

  if (data.transactions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Your monthly financial overview." />
        <EmptyState
          icon={Sparkles}
          title="Your financial picture starts here."
          description="Import a CSV of your transactions or add your first one manually. FinFlow will categorize everything and show you where your money goes."
          action={
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-2">
                <AddTransactionButton />
                <Button variant="outline" asChild>
                  <Link href="/transactions/import">
                    <Upload className="size-4" />
                    Import CSV
                  </Link>
                </Button>
              </div>
              <button
                onClick={() => {
                  resetDemo();
                  toast.success("Sample data loaded");
                }}
                className="text-[12px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                or explore with sample data
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`How you're doing in ${monthLabel(currentMonthKey(), { month: "long", year: "numeric" })}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions/import">
              <Upload className="size-4" />
              Import CSV
            </Link>
          </Button>
        }
      />
      <NetCashflow />
      <AccountBalances />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SpendingOverview />
        </div>
        <div className="lg:col-span-2">
          <BudgetProgress />
        </div>
      </div>
      <CategoryBreakdown />
      <RecentTransactions />
    </div>
  );
}
