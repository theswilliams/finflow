"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStore } from "@/lib/store";
import { toCents } from "@/lib/finance/money";
import { todayIso } from "@/lib/finance/dates";
import { CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/categories";
import { transactionFormSchema, type TransactionFormValues } from "@/lib/validation";
import type { CategoryId, Transaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryDot } from "@/components/shared";

const TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-[12px] text-negative">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function TransactionForm({
  mode,
  transaction,
  onDone,
  formId = "transaction-form",
}: {
  mode: "create" | "edit";
  transaction?: Transaction;
  onDone?: () => void;
  formId?: string;
}) {
  const { data, addTransaction, updateTransaction } = useStore();
  const accounts = data.accounts;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: (transaction.amount / 100).toFixed(2),
          merchant: transaction.merchant,
          date: transaction.date,
          accountId: transaction.accountId,
          transferAccountId: transaction.transferAccountId,
          categoryId: transaction.categoryId,
          description: transaction.description ?? "",
          notes: transaction.notes ?? "",
          tags: transaction.tags.join(", "),
        }
      : {
          type: "expense",
          amount: "",
          merchant: "",
          date: todayIso(),
          accountId: accounts[0]?.id ?? "",
          categoryId: undefined,
          description: "",
          notes: "",
          tags: "",
        },
  });

  const type = watch("type");

  const submit = handleSubmit((values) => {
    const amount = toCents(values.amount);
    const chosenCategory = values.categoryId as CategoryId | undefined;
    const tags = (values.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const resolvedCategory: CategoryId | undefined =
      values.type === "transfer" ? "transfer" : chosenCategory;

    if (mode === "create") {
      addTransaction({
        type: values.type,
        amount,
        merchant: values.merchant,
        date: values.date,
        accountId: values.accountId,
        transferAccountId: values.type === "transfer" ? values.transferAccountId : undefined,
        ...(resolvedCategory ? { categoryId: resolvedCategory } : {}),
        description: values.description || undefined,
        notes: values.notes || undefined,
        tags,
      });
    } else if (transaction) {
      updateTransaction(transaction.id, {
        type: values.type,
        amount,
        merchant: values.merchant,
        date: values.date,
        accountId: values.accountId,
        transferAccountId: values.type === "transfer" ? values.transferAccountId : undefined,
        categoryId: resolvedCategory ?? transaction.categoryId,
        categorySource: "manual",
        reviewed: true,
        description: values.description || undefined,
        notes: values.notes || undefined,
        tags,
      });
    }
    onDone?.();
  });

  const categoryOptions = type === "income" ? CATEGORIES.filter((c) => c.kind === "income") : EXPENSE_CATEGORIES;

  return (
    <form id={formId} onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setValue("type", t.value, { shouldValidate: true })}
            className={
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors " +
              (type === t.value ? "bg-surface text-foreground shadow-[var(--shadow-card)]" : "text-muted-foreground hover:text-foreground")
            }
            aria-pressed={type === t.value}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="amount" error={errors.amount?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="amount" inputMode="decimal" placeholder="0.00" className="pl-6 tnum" autoFocus {...register("amount")} />
          </div>
        </Field>
        <Field label="Date" htmlFor="date" error={errors.date?.message}>
          <Input id="date" type="date" className="tnum" {...register("date")} />
        </Field>
      </div>

      <Field label={type === "income" ? "Source" : "Merchant"} htmlFor="merchant" error={errors.merchant?.message}>
        <Input id="merchant" placeholder={type === "income" ? "e.g. Employer payroll" : "e.g. Loblaws"} {...register("merchant")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={type === "transfer" ? "From account" : "Account"} error={errors.accountId?.message}>
          <Select value={watch("accountId")} onValueChange={(v) => setValue("accountId", v, { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {type === "transfer" ? (
          <Field label="To account" error={errors.transferAccountId?.message}>
            <Select value={watch("transferAccountId") ?? ""} onValueChange={(v) => setValue("transferAccountId", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Field label="Category" error={errors.categoryId?.message} hint="Leave blank to auto-categorize">
            <Select value={watch("categoryId") ?? ""} onValueChange={(v) => setValue("categoryId", v as TransactionFormValues["categoryId"], { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Auto" /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2"><CategoryDot id={c.id} />{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      <Field label="Description" htmlFor="description" error={errors.description?.message}>
        <Input id="description" placeholder="Optional note shown in the transaction list" {...register("description")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tags" htmlFor="tags" hint="Comma separated">
          <Input id="tags" placeholder="reimbursable, work" {...register("tags")} />
        </Field>
        <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
          <Input id="notes" placeholder="Private notes" {...register("notes")} />
        </Field>
      </div>

      {!formId.includes("drawer") ? (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {mode === "create" ? "Add transaction" : "Save changes"}
        </Button>
      ) : null}
    </form>
  );
}
