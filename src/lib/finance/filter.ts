import type { CategoryId, Transaction, TransactionType } from "../types";

export interface TxnFilter {
  search: string;
  categories: CategoryId[];
  accounts: string[];
  types: TransactionType[];
  minAmount?: number; // cents
  maxAmount?: number; // cents
  from?: string; // iso
  to?: string; // iso
  tag?: string;
  reviewed?: "reviewed" | "unreviewed";
}

export type SortKey = "date" | "amount" | "merchant" | "category";
export type SortDir = "asc" | "desc";

export const EMPTY_FILTER: TxnFilter = {
  search: "",
  categories: [],
  accounts: [],
  types: [],
};

export function filterTransactions(txns: Transaction[], f: TxnFilter): Transaction[] {
  const q = f.search.trim().toLowerCase();
  return txns.filter((t) => {
    if (q && !(`${t.merchant} ${t.description ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(q))) return false;
    if (f.categories.length && !f.categories.includes(t.categoryId)) return false;
    if (f.accounts.length && !f.accounts.includes(t.accountId)) return false;
    if (f.types.length && !f.types.includes(t.type)) return false;
    if (f.minAmount != null && t.amount < f.minAmount) return false;
    if (f.maxAmount != null && t.amount > f.maxAmount) return false;
    if (f.from && t.date < f.from) return false;
    if (f.to && t.date > f.to) return false;
    if (f.tag && !t.tags.includes(f.tag)) return false;
    if (f.reviewed === "reviewed" && !t.reviewed) return false;
    if (f.reviewed === "unreviewed" && t.reviewed) return false;
    return true;
  });
}

export function sortTransactions(txns: Transaction[], key: SortKey, dir: SortDir): Transaction[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...txns].sort((a, b) => {
    let cmp = 0;
    if (key === "date") cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.localeCompare(b.createdAt);
    else if (key === "amount") cmp = a.amount - b.amount;
    else if (key === "merchant") cmp = a.merchant.localeCompare(b.merchant);
    else if (key === "category") cmp = a.categoryId.localeCompare(b.categoryId);
    return cmp * sign;
  });
}

export function activeFilterCount(f: TxnFilter): number {
  let n = 0;
  if (f.search.trim()) n++;
  n += f.categories.length ? 1 : 0;
  n += f.accounts.length ? 1 : 0;
  n += f.types.length ? 1 : 0;
  if (f.minAmount != null || f.maxAmount != null) n++;
  if (f.from || f.to) n++;
  if (f.tag) n++;
  if (f.reviewed) n++;
  return n;
}
