"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Keyboard, ArrowRight, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { EXPENSE_CATEGORIES, categoryName } from "@/lib/categories";
import { formatDate } from "@/lib/finance/dates";
import type { CategoryId } from "@/lib/types";
import { PageHeader, EmptyState, Money, CategoryDot } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/primitives";
import { MerchantAvatar } from "@/components/transactions/merchant-avatar";

// number keys 1-9,0 map to the first ten expense categories
const HOTKEYS = EXPENSE_CATEGORIES.slice(0, 10);

export function ReviewView() {
  const { data, ready, setCategory, updateTransaction } = useStore();
  const [lastAction, setLastAction] = useState<{ id: string; prevCat: CategoryId; prevReviewed: boolean } | null>(null);

  const queue = useMemo(
    () =>
      [...data.transactions]
        .filter((t) => t.type !== "transfer" && (!t.reviewed || t.categorySource === "uncategorized"))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.transactions],
  );

  const current = queue[0];

  const assign = (cat: CategoryId) => {
    if (!current) return;
    setLastAction({ id: current.id, prevCat: current.categoryId, prevReviewed: current.reviewed });
    setCategory(current.id, cat);
  };
  const confirm = () => {
    if (!current) return;
    setLastAction({ id: current.id, prevCat: current.categoryId, prevReviewed: current.reviewed });
    updateTransaction(current.id, { reviewed: true, categorySource: "manual" });
  };
  const undo = () => {
    if (!lastAction) return;
    updateTransaction(lastAction.id, { categoryId: lastAction.prevCat, reviewed: lastAction.prevReviewed });
    setLastAction(null);
    toast("Reverted");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter") {
        e.preventDefault();
        confirm();
      } else if (e.key.toLowerCase() === "u") {
        undo();
      } else if (/^[0-9]$/.test(e.key)) {
        const idx = e.key === "0" ? 9 : Number(e.key) - 1;
        if (HOTKEYS[idx]) assign(HOTKEYS[idx].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, lastAction]);

  if (ready && queue.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Review queue" />
        <EmptyState
          icon={CheckCircle2}
          title="Inbox zero"
          description="Every transaction has been reviewed and categorized. New imports that need attention will show up here."
          action={
            <Button variant="outline" asChild>
              <Link href="/transactions">Back to transactions</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!current) return null;
  const account = data.accounts.find((a) => a.id === current.accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description={`${queue.length} transaction${queue.length === 1 ? "" : "s"} need a quick check`}
        actions={
          lastAction ? (
            <Button variant="outline" size="sm" onClick={undo}>
              <Undo2 className="size-4" /> Undo
            </Button>
          ) : undefined
        }
      />

      <Card className="mx-auto max-w-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <MerchantAvatar name={current.merchant} className="size-11 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-foreground">{current.merchant}</p>
              <p className="text-[12px] text-muted-foreground">
                {formatDate(current.date)} · {account?.name}
              </p>
            </div>
            <Money
              cents={current.type === "income" ? current.amount : -current.amount}
              signed
              className={`text-lg font-semibold ${current.type === "income" ? "text-positive" : "text-foreground"}`}
            />
          </div>

          {current.description ? (
            <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">{current.description}</p>
          ) : null}

          <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Suggested: {categoryName(current.categoryId)}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {HOTKEYS.map((c, i) => (
              <button
                key={c.id}
                onClick={() => assign(c.id)}
                className="group flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-[13px] transition-colors hover:border-border-strong hover:bg-surface-muted"
              >
                <CategoryDot id={c.id} />
                <span className="flex-1 truncate">{c.name}</span>
                <kbd className="tnum rounded bg-surface-muted px-1 text-[10px] text-muted-foreground group-hover:bg-surface">
                  {i === 9 ? 0 : i + 1}
                </kbd>
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Keyboard className="size-3.5" />
              <kbd className="rounded bg-surface-muted px-1">1–0</kbd> categorize ·{" "}
              <kbd className="rounded bg-surface-muted px-1">Enter</kbd> keep ·{" "}
              <kbd className="rounded bg-surface-muted px-1">U</kbd> undo
            </span>
            <Button size="sm" onClick={confirm}>
              Keep <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mx-auto max-w-xl">
        <p className="mb-2 text-[12px] font-medium text-muted-foreground">Up next</p>
        <ul className="space-y-1.5">
          {queue.slice(1, 5).map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-[13px]">
              <MerchantAvatar name={t.merchant} className="size-6 text-[10px]" />
              <span className="flex-1 truncate">{t.merchant}</span>
              <Money cents={-t.amount} className="text-muted-foreground" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
