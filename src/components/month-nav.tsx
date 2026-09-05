"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { addMonths, currentMonthKey, monthLabel } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";

/** ‹ Month Year › — bounded by the earliest transaction and the current month. */
export function MonthNav({ className }: { className?: string }) {
  const { viewMonth, earliestMonth, setViewMonth } = useStore();
  const current = currentMonthKey();
  const canPrev = viewMonth > earliestMonth;
  const canNext = viewMonth < current;

  return (
    <div className={className}>
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-card)]">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canPrev}
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="tnum min-w-[7.5rem] text-center text-[13px] font-medium text-foreground">
          {monthLabel(viewMonth, { month: "long", year: "numeric" })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canNext}
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {viewMonth !== current ? (
        <button
          onClick={() => setViewMonth(current)}
          className="ml-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Today
        </button>
      ) : null}
    </div>
  );
}
