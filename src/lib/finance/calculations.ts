import type { Account, Budget, CategoryId, Transaction } from "../types";
import { monthKey, monthRange, daysInMonth, isoDate, now } from "./dates";

export interface PeriodSummary {
  income: number;
  expenses: number;
  net: number;
  transferVolume: number;
  txnCount: number;
}

function inMonth(t: Transaction, key: string): boolean {
  return monthKey(t.date) === key;
}

export function summarize(txns: Transaction[], monthK?: string): PeriodSummary {
  let income = 0;
  let expenses = 0;
  let transferVolume = 0;
  let count = 0;
  for (const t of txns) {
    if (monthK && !inMonth(t, monthK)) continue;
    count++;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expenses += t.amount;
    else transferVolume += t.amount;
  }
  return { income, expenses, net: income - expenses, transferVolume, txnCount: count };
}

/** percentage change new vs old; null when there is no meaningful base. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface CategorySpend {
  categoryId: CategoryId;
  amount: number;
  count: number;
  share: number; // 0..1 of total expenses
}

export function spendByCategory(txns: Transaction[], monthK?: string): CategorySpend[] {
  const acc = new Map<CategoryId, { amount: number; count: number }>();
  let total = 0;
  for (const t of txns) {
    if (t.type !== "expense") continue;
    if (monthK && !inMonth(t, monthK)) continue;
    const e = acc.get(t.categoryId) ?? { amount: 0, count: 0 };
    e.amount += t.amount;
    e.count += 1;
    acc.set(t.categoryId, e);
    total += t.amount;
  }
  return [...acc.entries()]
    .map(([categoryId, v]) => ({ categoryId, amount: v.amount, count: v.count, share: total ? v.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function accountBalance(account: Account, txns: Transaction[]): number {
  let bal = account.openingBalance;
  for (const t of txns) {
    if (t.type === "transfer") {
      if (t.accountId === account.id) bal -= t.amount;
      if (t.transferAccountId === account.id) bal += t.amount;
    } else if (t.accountId === account.id) {
      bal += t.type === "income" ? t.amount : -t.amount;
    }
  }
  return bal;
}

/** running daily net-worth-style balance change for an account across a month */
export function accountMonthTrend(account: Account, txns: Transaction[], monthK: string): number {
  let delta = 0;
  for (const t of txns) {
    if (monthKey(t.date) !== monthK) continue;
    if (t.type === "transfer") {
      if (t.accountId === account.id) delta -= t.amount;
      if (t.transferAccountId === account.id) delta += t.amount;
    } else if (t.accountId === account.id) {
      delta += t.type === "income" ? t.amount : -t.amount;
    }
  }
  // for credit cards / loans, spending down (negative delta) is "normal", not a loss
  return account.type === "credit_card" || account.type === "loan" ? -delta : delta;
}

export interface DailySpendPoint {
  date: string;
  spent: number;
  cumulative: number;
}

export function dailySpend(txns: Transaction[], monthK: string): DailySpendPoint[] {
  const { start } = monthRange(monthK);
  const [y, m] = monthK.split("-").map(Number);
  const days = daysInMonth(monthK);
  const byDay = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense" || monthKey(t.date) !== monthK) continue;
    byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
  }
  const today = isoDate(now());
  const points: DailySpendPoint[] = [];
  let cumulative = 0;
  for (let day = 1; day <= days; day++) {
    const iso = `${monthK}-${String(day).padStart(2, "0")}`;
    const spent = byDay.get(iso) ?? 0;
    cumulative += spent;
    // stop the cumulative line at today for the current month
    if (iso > today && monthK === today.slice(0, 7)) {
      points.push({ date: iso, spent: 0, cumulative: NaN });
    } else {
      points.push({ date: iso, spent, cumulative });
    }
  }
  void start;
  void y;
  void m;
  return points;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  ratio: number;
  state: "healthy" | "warning" | "over";
  projected: number;
}

export function budgetStatus(budget: Budget, txns: Transaction[], monthK: string): BudgetStatus {
  const spent = txns
    .filter((t) => t.type === "expense" && t.categoryId === budget.categoryId && monthKey(t.date) === monthK)
    .reduce((s, t) => s + t.amount, 0);
  const ratio = budget.limit ? spent / budget.limit : 0;
  const today = now();
  const isCurrent = monthK === isoDate(today).slice(0, 7);
  const elapsed = isCurrent ? today.getDate() / daysInMonth(monthK) : 1;
  const projected = isCurrent && elapsed > 0 ? Math.round(spent / elapsed) : spent;
  const state: BudgetStatus["state"] = ratio > 1 ? "over" : ratio >= 0.85 ? "warning" : "healthy";
  return { budget, spent, remaining: budget.limit - spent, ratio, state, projected };
}
