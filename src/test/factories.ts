import type { Account, Budget, CategorizationRule, Transaction } from "@/lib/types";

let n = 0;
const id = (p: string) => `${p}-${(n++).toString().padStart(4, "0")}`;

export function txn(over: Partial<Transaction> = {}): Transaction {
  const ts = "2026-01-01T00:00:00.000Z";
  return {
    id: id("txn"),
    accountId: "acc-cheq",
    date: "2026-06-15",
    merchant: "Test Merchant",
    amount: 1000,
    type: "expense",
    categoryId: "other",
    tags: [],
    reviewed: true,
    categorySource: "manual",
    createdAt: ts,
    updatedAt: ts,
    ...over,
  };
}

export function account(over: Partial<Account> = {}): Account {
  const ts = "2026-01-01T00:00:00.000Z";
  return {
    id: id("acc"),
    name: "Test Account",
    type: "chequing",
    openingBalance: 0,
    currency: "CAD",
    createdAt: ts,
    updatedAt: ts,
    ...over,
  };
}

export function budget(over: Partial<Budget> = {}): Budget {
  const ts = "2026-01-01T00:00:00.000Z";
  return { id: id("bgt"), categoryId: "groceries", limit: 50000, createdAt: ts, updatedAt: ts, ...over };
}

export function rule(over: Partial<CategorizationRule> = {}): CategorizationRule {
  return {
    id: id("rule"),
    field: "merchant",
    op: "contains",
    value: "test",
    categoryId: "shopping",
    priority: 100,
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}
