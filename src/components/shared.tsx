"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance/money";
import { categoryColor, categoryName } from "@/lib/categories";
import type { AccountType, CategoryId, CurrencyCode } from "@/lib/types";
import { Badge } from "@/components/ui/primitives";

/* ------------------------------ Money ------------------------------ */
export function Money({
  cents,
  currency = "CAD",
  signed = false,
  showCents = true,
  compact = false,
  className,
  colorize = false,
}: {
  cents: number;
  currency?: CurrencyCode;
  signed?: boolean;
  showCents?: boolean;
  compact?: boolean;
  className?: string;
  colorize?: boolean;
}) {
  const tone = colorize ? (cents > 0 ? "text-positive" : cents < 0 ? "text-negative" : "text-foreground") : undefined;
  return (
    <span className={cn("tnum", tone, className)}>
      {formatMoney(cents, currency, { signed, showCents, compact })}
    </span>
  );
}

/* --------------------------- Trend pill ---------------------------- */
export function TrendPill({
  pct,
  invert = false,
  suffix = "vs last month",
  className,
}: {
  pct: number | null;
  /** when true, a decrease is "good" (e.g. spending) */
  invert?: boolean;
  suffix?: string;
  className?: string;
}) {
  if (pct === null) {
    return <span className={cn("text-[12px] text-muted-foreground", className)}>— {suffix}</span>;
  }
  const rounded = Math.round(pct * 10) / 10;
  const flat = Math.abs(rounded) < 0.1;
  const good = flat ? null : invert ? rounded < 0 : rounded > 0;
  const Icon = flat ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;
  const abs = Math.abs(rounded);
  const magnitude = abs >= 200 ? "200%+" : `${abs >= 100 ? Math.round(abs) : abs}%`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium",
        good === null ? "text-muted-foreground" : good ? "text-positive" : "text-negative",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {flat ? "No change" : magnitude}
      <span className="font-normal text-muted-foreground">{suffix}</span>
    </span>
  );
}

/* --------------------------- Category pill ------------------------- */
export function CategoryDot({ id, className }: { id: CategoryId; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: categoryColor(id) }}
    />
  );
}

export function CategoryPill({ id, className }: { id: CategoryId; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[12px] font-medium text-foreground",
        className,
      )}
    >
      <CategoryDot id={id} />
      {categoryName(id)}
    </span>
  );
}

/* ------------------------- Account type badge -------------------- */
const ACCOUNT_LABEL: Record<AccountType, string> = {
  chequing: "Chequing",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  investment: "Investment",
  loan: "Loan",
};
export function accountTypeLabel(t: AccountType) {
  return ACCOUNT_LABEL[t];
}
export function AccountTypeBadge({ type }: { type: AccountType }) {
  return <Badge variant="outline">{ACCOUNT_LABEL[type]}</Badge>;
}

/* ----------------------------- Page header ----------------------- */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ----------------------------- Empty state ----------------------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
