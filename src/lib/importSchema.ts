import { z } from "zod";
import type { FinanceData } from "./types";

/**
 * Validation for user-supplied "Import JSON" files. The file is untrusted input:
 * without this, a valid-JSON file with the wrong shape would be loaded straight
 * into app state (crashing the UI) and written to the database.
 */

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_ACCOUNTS = 200;
const MAX_TRANSACTIONS = 100_000;
const MAX_OTHER = 2_000;

const CATEGORY_IDS = [
  "housing", "transportation", "groceries", "restaurants", "shopping", "entertainment",
  "utilities", "subscriptions", "health", "travel", "personal", "income", "transfer", "other",
] as const;

const str = (max = 300) => z.string().max(max);
const id = z.string().min(1).max(100);
const cents = z.number().int().safe();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "expected a yyyy-mm-dd date");
const timestamp = z.string().min(1).max(40);

const accountSchema = z.object({
  id,
  name: str(100).min(1),
  type: z.enum(["chequing", "savings", "credit_card", "cash", "investment", "loan"]),
  institution: str(100).optional(),
  openingBalance: cents,
  currency: z.enum(["CAD", "USD", "EUR", "GBP"]),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const transactionSchema = z.object({
  id,
  accountId: id,
  date: isoDate,
  merchant: str(200).min(1),
  description: str(500).optional(),
  amount: cents.positive(),
  type: z.enum(["expense", "income", "transfer"]),
  categoryId: z.enum(CATEGORY_IDS),
  transferAccountId: id.optional(),
  notes: str(2000).optional(),
  tags: z.array(str(50)).max(50).default([]),
  reviewed: z.boolean(),
  categorySource: z.enum(["manual", "rule", "auto", "uncategorized"]),
  categoryConfidence: z.number().min(0).max(1).optional(),
  importHash: str(400).optional(),
  isDemo: z.boolean().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const ruleSchema = z.object({
  id,
  field: z.enum(["merchant", "description"]),
  op: z.enum(["contains", "equals", "starts_with"]),
  value: str(200).min(1),
  categoryId: z.enum(CATEGORY_IDS),
  priority: z.number().int().min(-10_000).max(10_000),
  enabled: z.boolean(),
  createdAt: timestamp,
});

const budgetSchema = z.object({
  id,
  categoryId: z.enum(CATEGORY_IDS),
  limit: cents.nonnegative(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const goalSchema = z.object({
  id,
  name: str(100).min(1),
  targetAmount: cents.positive(),
  currentAmount: cents.nonnegative(),
  targetDate: isoDate.optional(),
  accentVar: str(60).optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const financeDataSchema = z
  .object({
    version: z.number().int(),
    accounts: z.array(accountSchema).max(MAX_ACCOUNTS),
    transactions: z.array(transactionSchema).max(MAX_TRANSACTIONS),
    budgets: z.array(budgetSchema).max(MAX_OTHER),
    goals: z.array(goalSchema).max(MAX_OTHER),
    rules: z.array(ruleSchema).max(MAX_OTHER),
    seededDemo: z.boolean(),
    seedVersion: z.number().int().optional(),
    referenceDate: isoDate.optional(),
  })
  .superRefine((data, ctx) => {
    const accountIds = new Set(data.accounts.map((a) => a.id));
    if (accountIds.size !== data.accounts.length) {
      ctx.addIssue({ code: "custom", message: "duplicate account ids" });
    }
    data.transactions.forEach((t, i) => {
      if (!accountIds.has(t.accountId)) {
        ctx.addIssue({ code: "custom", path: ["transactions", i, "accountId"], message: "references an unknown account" });
      }
      if (t.transferAccountId !== undefined) {
        if (!accountIds.has(t.transferAccountId)) {
          ctx.addIssue({ code: "custom", path: ["transactions", i, "transferAccountId"], message: "references an unknown account" });
        }
        if (t.transferAccountId === t.accountId) {
          ctx.addIssue({ code: "custom", path: ["transactions", i, "transferAccountId"], message: "cannot equal the source account" });
        }
      }
    });
  });

/** Parse and validate an exported FinFlow JSON file. Throws an Error with a user-safe message. */
export function parseFinanceData(raw: string): FinanceData {
  if (raw.length > MAX_IMPORT_BYTES) throw new Error("That file is too large to import.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const result = financeDataSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length ? ` (${issue.path.join(".")})` : "";
    throw new Error(`That file isn't a valid FinFlow export: ${issue.message}${where}.`);
  }
  return result.data as FinanceData;
}
