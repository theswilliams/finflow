"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { relativeDay } from "@/lib/finance/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Money, CategoryDot } from "@/components/shared";
import { categoryName } from "@/lib/categories";
import { TransactionDrawer } from "@/components/transactions/transaction-drawer";
import { MerchantAvatar } from "@/components/transactions/merchant-avatar";

export function RecentTransactions() {
  const { data } = useStore();
  const [active, setActive] = useState<Transaction | null>(null);

  const recent = useMemo(
    () => [...data.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 9),
    [data.transactions],
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent transactions</CardTitle>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="px-2">
        <ul className="divide-y divide-border">
          {recent.map((t) => {
            const account = data.accounts.find((a) => a.id === t.accountId);
            const signed = t.type === "income" ? t.amount : t.type === "transfer" ? 0 : -t.amount;
            return (
              <li key={t.id}>
                <button
                  onClick={() => setActive(t)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                >
                  <MerchantAvatar name={t.merchant} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{t.merchant}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CategoryDot id={t.categoryId} />
                      {categoryName(t.categoryId)}
                      <span aria-hidden>·</span>
                      {relativeDay(t.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Money
                      cents={signed}
                      signed={t.type !== "transfer"}
                      className={`text-[13px] font-semibold ${
                        t.type === "income" ? "text-positive" : "text-foreground"
                      }`}
                    />
                    <p className="truncate text-[11px] text-muted-foreground">{account?.name}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
      <TransactionDrawer transaction={active} open={!!active} onOpenChange={(v) => !v && setActive(null)} />
    </Card>
  );
}
