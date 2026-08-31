"use client";

import { EXPENSE_CATEGORIES, CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryDot } from "@/components/shared";

export function CategorySelect({
  value,
  onChange,
  includeIncome = true,
  className,
  ariaLabel = "Category",
}: {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
  includeIncome?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const options = includeIncome
    ? CATEGORIES.filter((c) => c.kind !== "transfer")
    : EXPENSE_CATEGORIES;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CategoryId)}>
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="flex items-center gap-2">
              <CategoryDot id={c.id} />
              {c.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
