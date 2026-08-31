import { z } from "zod";
import { CATEGORIES } from "./categories";

const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];

export const transactionFormSchema = z
  .object({
    type: z.enum(["expense", "income", "transfer"]),
    amount: z
      .string()
      .min(1, "Enter an amount")
      .refine((v) => {
        const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
        return !Number.isNaN(n) && n > 0;
      }, "Enter a valid amount greater than zero"),
    merchant: z.string().trim().min(1, "Enter a merchant or payee").max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    accountId: z.string().min(1, "Choose an account"),
    transferAccountId: z.string().optional(),
    categoryId: z.enum(categoryIds).optional(),
    description: z.string().trim().max(240).optional(),
    notes: z.string().trim().max(600).optional(),
    tags: z.string().optional(),
  })
  .refine((v) => v.type !== "transfer" || (v.transferAccountId && v.transferAccountId !== v.accountId), {
    message: "Choose a different destination account",
    path: ["transferAccountId"],
  });

export type TransactionFormValues = z.input<typeof transactionFormSchema>;

export const budgetFormSchema = z.object({
  categoryId: z.enum(categoryIds),
  limit: z.string().min(1, "Enter a monthly limit"),
});

export const goalFormSchema = z.object({
  name: z.string().trim().min(1, "Name your goal").max(80),
  targetAmount: z.string().min(1, "Enter a target amount"),
  currentAmount: z.string().min(1, "Enter the current amount").or(z.literal("")),
  targetDate: z.string().optional(),
});

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Name the account").max(80),
  type: z.enum(["chequing", "savings", "credit_card", "cash", "investment", "loan"]),
  institution: z.string().trim().max(80).optional(),
  openingBalance: z.string().optional(),
});

export const ruleFormSchema = z.object({
  field: z.enum(["merchant", "description"]),
  op: z.enum(["contains", "equals", "starts_with"]),
  value: z.string().trim().min(1, "Enter text to match").max(80),
  categoryId: z.enum(categoryIds),
});
