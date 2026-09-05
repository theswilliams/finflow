"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { budgetStatus } from "@/lib/finance/calculations";
import { currentMonthKey, daysInMonth, now } from "@/lib/finance/dates";
import { MonthNav } from "@/components/month-nav";
import { CATEGORIES, EXPENSE_CATEGORIES, categoryName } from "@/lib/categories";
import { toCents } from "@/lib/finance/money";
import type { CategoryId } from "@/lib/types";
import { PageHeader, EmptyState, Money } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, StatLabel } from "@/components/ui/primitives";
import { BudgetBar } from "./budget-bar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/overlays";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDot } from "@/components/shared";

export function BudgetsView() {
  const { data, ready, viewMonth, upsertBudget, removeBudget } = useStore();
  const month = viewMonth;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ categoryId: CategoryId; limit: string } | null>(null);

  const statuses = useMemo(
    () => data.budgets.map((b) => budgetStatus(b, data.transactions, month)).sort((a, b) => b.ratio - a.ratio),
    [data.budgets, data.transactions, month],
  );

  const totals = useMemo(() => {
    const budget = statuses.reduce((s, x) => s + x.budget.limit, 0);
    const spent = statuses.reduce((s, x) => s + x.spent, 0);
    const projected = statuses.reduce((s, x) => s + Math.max(x.spent, x.projected), 0);
    return { budget, spent, projected, remaining: budget - spent };
  }, [statuses]);

  const isCurrentMonth = month === currentMonthKey();
  const dayOfMonth = now().getDate();
  const totalDays = daysInMonth(month);
  const progressLabel = isCurrentMonth ? `day ${dayOfMonth} of ${totalDays}` : "complete";
  const unbudgeted = EXPENSE_CATEGORIES.filter((c) => !data.budgets.some((b) => b.categoryId === c.id));

  const openCreate = () => {
    setEditing({ categoryId: unbudgeted[0]?.id ?? "groceries", limit: "" });
    setDialogOpen(true);
  };
  const openEdit = (categoryId: CategoryId, limit: number) => {
    setEditing({ categoryId, limit: (limit / 100).toString() });
    setDialogOpen(true);
  };

  if (ready && data.budgets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Budgets" description="Set a monthly limit for each category and track progress." actions={<MonthNav />} />
        <EmptyState
          icon={Wallet}
          title="Give your money a plan."
          description="Set a monthly limit for the categories that matter and watch your progress through the month."
          action={<Button onClick={openCreate}><Plus className="size-4" /> Create your first budget</Button>}
        />
        <BudgetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          setEditing={setEditing}
          existing={data.budgets.map((b) => b.categoryId)}
          onSave={(cat, limit) => {
            upsertBudget(cat, limit);
            toast.success(`Budget set for ${categoryName(cat)}`);
            setDialogOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description={`${progressLabel === "complete" ? "Month complete" : progressLabel}`}
        actions={
          <>
            <MonthNav />
            <Button size="sm" onClick={openCreate}><Plus className="size-4" /> New budget</Button>
          </>
        }
      />

      {/* summary */}
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-4">
          <div>
            <StatLabel>Total budget</StatLabel>
            <Money cents={totals.budget} showCents={false} className="mt-1 block text-xl font-semibold" />
          </div>
          <div>
            <StatLabel>Spent so far</StatLabel>
            <Money cents={totals.spent} showCents={false} className="mt-1 block text-xl font-semibold" />
          </div>
          <div>
            <StatLabel>Remaining</StatLabel>
            <Money
              cents={totals.remaining}
              showCents={false}
              className={`mt-1 block text-xl font-semibold ${totals.remaining < 0 ? "text-negative" : "text-positive"}`}
            />
          </div>
          <div>
            <StatLabel>Projected month-end</StatLabel>
            <Money
              cents={totals.projected}
              showCents={false}
              className={`mt-1 block text-xl font-semibold ${totals.projected > totals.budget ? "text-warning" : "text-foreground"}`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {statuses.map((s) => (
          <Card key={s.budget.id}>
            <CardContent className="space-y-3 p-4">
              <BudgetBar status={s} />
              <div className="flex items-center justify-between border-t border-border pt-2 text-[12px] text-muted-foreground">
                <span>
                  Projected <Money cents={s.projected} showCents={false} className="font-medium text-foreground" />
                </span>
                <span className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Edit budget" onClick={() => openEdit(s.budget.categoryId, s.budget.limit)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete budget"
                    className="text-negative hover:bg-negative-soft"
                    onClick={() => {
                      removeBudget(s.budget.id);
                      toast.success("Budget removed");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {unbudgeted.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Categories without a budget</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unbudgeted.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setEditing({ categoryId: c.id, limit: "" });
                  setDialogOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-2.5 py-1 text-[12px] text-muted-foreground hover:border-solid hover:text-foreground"
              >
                <CategoryDot id={c.id} /> {c.name} <Plus className="size-3" />
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        setEditing={setEditing}
        existing={data.budgets.map((b) => b.categoryId)}
        onSave={(cat, limit) => {
          upsertBudget(cat, limit);
          toast.success(`Budget saved for ${categoryName(cat)}`);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function BudgetDialog({
  open,
  onOpenChange,
  editing,
  setEditing,
  existing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: { categoryId: CategoryId; limit: string } | null;
  setEditing: (v: { categoryId: CategoryId; limit: string } | null) => void;
  existing: CategoryId[];
  onSave: (cat: CategoryId, limit: number) => void;
}) {
  if (!editing) return null;
  const isEdit = existing.includes(editing.categoryId);
  const options = CATEGORIES.filter((c) => c.kind === "expense" && (c.id === editing.categoryId || !existing.includes(c.id)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit budget" : "New monthly budget"}</DialogTitle>
          <DialogDescription>Set how much you plan to spend in this category each month.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const cents = toCents(editing.limit);
            if (cents > 0) onSave(editing.categoryId, cents);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={editing.categoryId}
              onValueChange={(v) => setEditing({ ...editing, categoryId: v as CategoryId })}
              disabled={isEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2"><CategoryDot id={c.id} />{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget-limit">Monthly limit</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="budget-limit"
                inputMode="decimal"
                autoFocus
                className="pl-6 tnum"
                placeholder="0.00"
                value={editing.limit}
                onChange={(e) => setEditing({ ...editing, limit: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit">{isEdit ? "Save" : "Create budget"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
