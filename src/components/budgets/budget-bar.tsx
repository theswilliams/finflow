"use client";

import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/lib/finance/calculations";
import { categoryName } from "@/lib/categories";
import { Progress } from "@/components/ui/controls";
import { Money, CategoryDot } from "@/components/shared";
import { AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";

const STATE_META = {
  healthy: { label: "On track", icon: "text-positive", bar: "bg-positive", Icon: CheckCircle2 },
  warning: { label: "Near limit", icon: "text-warning", bar: "bg-warning", Icon: CircleDot },
  over: { label: "Over budget", icon: "text-negative", bar: "bg-negative", Icon: AlertTriangle },
} as const;

export function BudgetBar({
  status,
  onClick,
  compact = false,
}: {
  status: BudgetStatus;
  onClick?: () => void;
  compact?: boolean;
}) {
  const meta = STATE_META[status.state];
  const Icon = meta.Icon;
  const pct = Math.round(status.ratio * 100);

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <CategoryDot id={status.budget.categoryId} />
          {categoryName(status.budget.categoryId)}
        </span>
        <span className="tnum text-[12px] text-muted-foreground">
          <Money cents={status.spent} showCents={false} className="font-medium text-foreground" />
          {" / "}
          <Money cents={status.budget.limit} showCents={false} />
        </span>
      </div>
      <Progress
        value={status.ratio * 100}
        label={`${categoryName(status.budget.categoryId)} budget used`}
        className="mt-2"
        indicatorClassName={meta.bar}
      />
      {!compact ? (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Icon className={cn("size-3", meta.icon)} />
          <span>
            {meta.label} · {pct}% used ·{" "}
            {status.remaining >= 0 ? (
              <>
                <Money cents={status.remaining} showCents={false} /> left
              </>
            ) : (
              <>
                <Money cents={-status.remaining} showCents={false} /> over
              </>
            )}
          </span>
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full rounded-lg p-2 text-left transition-colors hover:bg-surface-muted">
        {body}
      </button>
    );
  }
  return <div className="w-full">{body}</div>;
}
