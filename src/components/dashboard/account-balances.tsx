"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Landmark, PiggyBank, CreditCard, Wallet, TrendingUp, HandCoins } from "lucide-react";
import { useStore } from "@/lib/store";
import { accountBalance, accountMonthTrend, pctChange } from "@/lib/finance/calculations";
import { currentMonthKey, addMonths } from "@/lib/finance/dates";
import type { AccountType } from "@/lib/types";
import { Card } from "@/components/ui/primitives";
import { Money, TrendPill, accountTypeLabel } from "@/components/shared";

const ICONS: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  chequing: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Wallet,
  investment: TrendingUp,
  loan: HandCoins,
};

export function AccountBalances() {
  const { data } = useStore();
  const month = currentMonthKey();
  const prev = addMonths(month, -1);

  const rows = useMemo(
    () =>
      data.accounts.map((a) => {
        const balance = accountBalance(a, data.transactions);
        const thisMonth = accountMonthTrend(a, data.transactions, month);
        const lastMonth = accountMonthTrend(a, data.transactions, prev);
        return { account: a, balance, change: pctChange(thisMonth, lastMonth) };
      }),
    [data.accounts, data.transactions, month, prev],
  );

  if (!rows.length) return null;

  return (
    <section aria-labelledby="accounts-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="accounts-heading" className="text-sm font-semibold text-foreground">
          Accounts
        </h2>
        <Link href="/settings" className="text-[12px] font-medium text-muted-foreground hover:text-foreground">
          Manage
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {rows.map(({ account, balance, change }) => {
          const Icon = ICONS[account.type];
          const negative = balance < 0;
          return (
            <Card key={account.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <TrendPill pct={change} suffix="" invert={account.type === "credit_card" || account.type === "loan"} />
              </div>
              <p className="mt-3 truncate text-[13px] font-medium text-foreground">{account.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {accountTypeLabel(account.type)}
                {account.institution ? ` · ${account.institution}` : ""}
              </p>
              <Money
                cents={balance}
                showCents={false}
                className={`mt-2 block text-lg font-semibold ${negative ? "text-negative" : "text-foreground"}`}
              />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
