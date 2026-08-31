"use client";

import { useState } from "react";
import { Plus, Target, Pencil, Trash2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { toCents } from "@/lib/finance/money";
import { formatDate } from "@/lib/finance/dates";
import type { Goal } from "@/lib/types";
import { PageHeader, EmptyState, Money } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Input, Label } from "@/components/ui/primitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/overlays";

const ACCENTS = ["--positive", "--cat-travel", "--cat-transportation", "--cat-housing", "--cat-shopping", "--cat-entertainment"];

function monthsUntil(iso?: string): number | null {
  if (!iso) return null;
  const now = new Date();
  const target = new Date(iso);
  return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
}

export function GoalsView() {
  const { data, ready, addGoal, updateGoal, removeGoal } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Goal> & { _amt?: string; _cur?: string } | null>(null);

  const startCreate = () => {
    setDraft({ name: "", _amt: "", _cur: "0", targetDate: "", accentVar: ACCENTS[data.goals.length % ACCENTS.length] });
    setOpen(true);
  };
  const startEdit = (g: Goal) => {
    setDraft({ ...g, _amt: (g.targetAmount / 100).toString(), _cur: (g.currentAmount / 100).toString() });
    setOpen(true);
  };

  const save = () => {
    if (!draft?.name?.trim()) return;
    const target = toCents(draft._amt ?? "0");
    const current = toCents(draft._cur ?? "0");
    if (target <= 0) return;
    if (draft.id) {
      updateGoal(draft.id, { name: draft.name, targetAmount: target, currentAmount: current, targetDate: draft.targetDate || undefined, accentVar: draft.accentVar });
      toast.success("Goal updated");
    } else {
      addGoal({
        name: draft.name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate: draft.targetDate || undefined,
        accentVar: draft.accentVar,
      });
      toast.success("Goal created");
    }
    setOpen(false);
  };

  if (ready && data.goals.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Goals" />
        <EmptyState
          icon={Target}
          title="What are you saving for?"
          description="Set a target and a date. FinFlow tracks your progress and shows how much to set aside each month."
          action={<Button onClick={startCreate}><Plus className="size-4" /> Create a goal</Button>}
        />
        <GoalDialog open={open} onOpenChange={setOpen} draft={draft} setDraft={setDraft} onSave={save} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Goals" description={`${data.goals.length} savings goals`} actions={<Button size="sm" onClick={startCreate}><Plus className="size-4" /> New goal</Button>} />

      <div className="grid gap-4 sm:grid-cols-2">
        {data.goals.map((g) => {
          const pct = g.targetAmount ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
          const done = g.currentAmount >= g.targetAmount;
          const months = monthsUntil(g.targetDate);
          const perMonth = months && months > 0 ? Math.ceil((g.targetAmount - g.currentAmount) / months) : null;
          const accent = `var(${g.accentVar ?? "--positive"})`;
          return (
            <Card key={g.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{g.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {g.targetDate ? `Target ${formatDate(g.targetDate, { month: "short", year: "numeric" })}` : "No target date"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="Edit goal" onClick={() => startEdit(g)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-negative hover:bg-negative-soft"
                      aria-label="Delete goal"
                      onClick={() => {
                        removeGoal(g.id);
                        toast.success("Goal removed");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <Money cents={g.currentAmount} showCents={false} className="text-2xl font-semibold text-foreground" />
                  <span className="text-[13px] text-muted-foreground">
                    of <Money cents={g.targetAmount} showCents={false} />
                  </span>
                </div>

                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: accent }} />
                </div>

                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className="tnum font-medium" style={{ color: done ? "var(--positive)" : undefined }}>
                    {Math.round(pct)}% {done ? "· reached" : ""}
                  </span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-positive">
                      <PartyPopper className="size-3.5" /> Goal reached
                    </span>
                  ) : perMonth ? (
                    <span className="text-muted-foreground">
                      <Money cents={perMonth} showCents={false} className="font-medium text-foreground" />/mo for {months} mo
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      <Money cents={g.targetAmount - g.currentAmount} showCents={false} /> to go
                    </span>
                  )}
                </div>

                {!done ? (
                  <div className="mt-4 flex gap-2">
                    {[50, 100, 250].map((amt) => (
                      <Button
                        key={amt}
                        variant="subtle"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          updateGoal(g.id, { currentAmount: Math.min(g.targetAmount, g.currentAmount + amt * 100) });
                          toast.success(`Added $${amt} to ${g.name}`);
                        }}
                      >
                        +${amt}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <GoalDialog open={open} onOpenChange={setOpen} draft={draft} setDraft={setDraft} onSave={save} />
    </div>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: (Partial<Goal> & { _amt?: string; _cur?: string }) | null;
  setDraft: (v: (Partial<Goal> & { _amt?: string; _cur?: string }) | null) => void;
  onSave: () => void;
}) {
  if (!draft) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>Give it a name, a target, and (optionally) a date.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Name</Label>
            <Input id="goal-name" autoFocus value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Emergency fund" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target</Label>
              <Input id="goal-target" inputMode="decimal" className="tnum" placeholder="10000" value={draft._amt ?? ""} onChange={(e) => setDraft({ ...draft, _amt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">Saved so far</Label>
              <Input id="goal-current" inputMode="decimal" className="tnum" placeholder="0" value={draft._cur ?? ""} onChange={(e) => setDraft({ ...draft, _cur: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Target date</Label>
            <Input id="goal-date" type="date" value={draft.targetDate ?? ""} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Accent</Label>
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={`Accent ${a}`}
                  onClick={() => setDraft({ ...draft, accentVar: a })}
                  className={`size-6 rounded-full border-2 ${draft.accentVar === a ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: `var(${a})` }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit">{draft.id ? "Save" : "Create goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
