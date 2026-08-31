import type { CategoryId, Transaction } from "../types";
import { monthKey } from "./dates";

export interface MerchantStat {
  merchant: string;
  total: number;
  count: number;
  categoryId: CategoryId;
  avg: number;
}

export function merchantStats(txns: Transaction[], limit = 10): MerchantStat[] {
  const acc = new Map<string, { total: number; count: number; categoryId: CategoryId }>();
  for (const t of txns) {
    if (t.type !== "expense") continue;
    const key = t.merchant.trim();
    const e = acc.get(key) ?? { total: 0, count: 0, categoryId: t.categoryId };
    e.total += t.amount;
    e.count += 1;
    acc.set(key, e);
  }
  return [...acc.entries()]
    .map(([merchant, v]) => ({ merchant, total: v.total, count: v.count, categoryId: v.categoryId, avg: Math.round(v.total / v.count) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringExpense {
  merchant: string;
  categoryId: CategoryId;
  typicalAmount: number;
  frequency: RecurringFrequency;
  occurrences: number;
  lastDate: string;
  estimatedAnnual: number;
}

const FREQ_PER_YEAR: Record<RecurringFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

function classifyInterval(avgDays: number): RecurringFrequency | null {
  if (avgDays >= 5 && avgDays <= 9) return "weekly";
  if (avgDays >= 11 && avgDays <= 18) return "biweekly";
  if (avgDays >= 25 && avgDays <= 38) return "monthly";
  if (avgDays >= 80 && avgDays <= 100) return "quarterly";
  if (avgDays >= 330 && avgDays <= 400) return "yearly";
  return null;
}

function daysBetween(a: string, b: string): number {
  return Math.abs((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** Heuristic recurring-transaction detection: same merchant, regular cadence, stable amount. */
export function detectRecurring(txns: Transaction[]): RecurringExpense[] {
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of txns) {
    if (t.type !== "expense") continue;
    const key = t.merchant.trim().toLowerCase();
    (byMerchant.get(key) ?? byMerchant.set(key, []).get(key)!).push(t);
  }

  const out: RecurringExpense[] = [];
  for (const list of byMerchant.values()) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const freq = classifyInterval(avgGap);
    if (!freq) continue;

    const amounts = sorted.map((t) => t.amount);
    const meanAmt = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - meanAmt) ** 2, 0) / amounts.length;
    const cv = Math.sqrt(variance) / meanAmt;
    if (cv > 0.25) continue; // amount too irregular to call it a subscription

    const typical = Math.round([...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)]);
    out.push({
      merchant: sorted[sorted.length - 1].merchant,
      categoryId: sorted[sorted.length - 1].categoryId,
      typicalAmount: typical,
      frequency: freq,
      occurrences: sorted.length,
      lastDate: sorted[sorted.length - 1].date,
      estimatedAnnual: Math.round(typical * FREQ_PER_YEAR[freq]),
    });
  }
  return out.sort((a, b) => b.estimatedAnnual - a.estimatedAnnual);
}

export interface Anomaly {
  categoryId: CategoryId;
  currentMonth: number;
  average: number;
  pctOver: number;
}

/** Conservative: only flag categories at least 30% above their trailing average with a meaningful base. */
export function detectAnomalies(txns: Transaction[], currentMonthK: string, lookbackMonths = 3): Anomaly[] {
  const priorKeys = new Set<string>();
  const d = new Date(`${currentMonthK}-01T00:00:00`);
  for (let i = 1; i <= lookbackMonths; i++) {
    const p = new Date(d.getFullYear(), d.getMonth() - i, 1);
    priorKeys.add(`${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`);
  }

  const current = new Map<CategoryId, number>();
  const prior = new Map<CategoryId, number[]>();
  for (const t of txns) {
    if (t.type !== "expense") continue;
    const mk = monthKey(t.date);
    if (mk === currentMonthK) current.set(t.categoryId, (current.get(t.categoryId) ?? 0) + t.amount);
    else if (priorKeys.has(mk)) {
      const arr = prior.get(t.categoryId) ?? [];
      arr.push(t.amount);
      prior.set(t.categoryId, arr);
    }
  }

  const out: Anomaly[] = [];
  for (const [cat, cur] of current) {
    const priorTotal = (prior.get(cat) ?? []).reduce((s, a) => s + a, 0);
    const avg = priorTotal / lookbackMonths;
    if (avg < 5000) continue; // ignore trivial categories (< $50/mo avg)
    const pctOver = ((cur - avg) / avg) * 100;
    if (pctOver >= 30) out.push({ categoryId: cat, currentMonth: cur, average: Math.round(avg), pctOver });
  }
  return out.sort((a, b) => b.pctOver - a.pctOver);
}

export function categoryTrend(txns: Transaction[], monthKeys: string[], categories: CategoryId[]): Record<string, number | string>[] {
  return monthKeys.map((mk) => {
    const row: Record<string, number | string> = { month: mk };
    for (const c of categories) row[c] = 0;
    for (const t of txns) {
      if (t.type !== "expense" || monthKey(t.date) !== mk) continue;
      if (categories.includes(t.categoryId)) row[t.categoryId] = (row[t.categoryId] as number) + t.amount;
    }
    return row;
  });
}
