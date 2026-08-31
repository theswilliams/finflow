import type { CategorizationRule, Transaction, TransactionType } from "./types";
import { categorize } from "./categorization/engine";
import { toCents } from "./finance/money";
import { uid } from "./utils";
import { computeImportHash } from "./finance/hash";

export type ColumnRole = "date" | "merchant" | "description" | "amount" | "amount_in" | "amount_out" | "ignore";

export const COLUMN_ROLES: { value: ColumnRole; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "merchant", label: "Merchant / Payee" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount (signed)" },
  { value: "amount_out", label: "Amount — debit / out" },
  { value: "amount_in", label: "Amount — credit / in" },
  { value: "ignore", label: "Ignore column" },
];

const DATE_HINTS = ["date", "posted", "transaction date"];
const MERCHANT_HINTS = ["merchant", "payee", "name", "description", "details", "narrative"];
const DESC_HINTS = ["memo", "notes", "reference", "particulars"];
const AMOUNT_HINTS = ["amount", "value"];
const DEBIT_HINTS = ["debit", "withdrawal", "paid out", "money out"];
const CREDIT_HINTS = ["credit", "deposit", "paid in", "money in"];

export function guessRoles(headers: string[]): ColumnRole[] {
  const used = new Set<ColumnRole>();
  return headers.map((hRaw) => {
    const h = hRaw.toLowerCase().trim();
    const match = (hints: string[]) => hints.some((x) => h.includes(x));
    let role: ColumnRole = "ignore";
    if (match(DATE_HINTS) && !used.has("date")) role = "date";
    else if (match(DEBIT_HINTS) && !used.has("amount_out")) role = "amount_out";
    else if (match(CREDIT_HINTS) && !used.has("amount_in")) role = "amount_in";
    else if (match(AMOUNT_HINTS) && !used.has("amount")) role = "amount";
    else if (match(MERCHANT_HINTS) && !used.has("merchant")) role = "merchant";
    else if (match(DESC_HINTS) && !used.has("description")) role = "description";
    if (role !== "ignore") used.add(role);
    return role;
  });
}

/** Parse many common date formats to yyyy-mm-dd. Returns null if unparseable. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy or mm/dd/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const [, a, b, yRaw] = m;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    // assume day-first when first group > 12
    const first = Number(a);
    const second = Number(b);
    const day = first > 12 ? a : second > 12 ? b : a;
    const mon = day === a ? b : a;
    return `${y}-${mon.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

export interface ParsedRow {
  ok: boolean;
  reason?: string;
  date: string;
  merchant: string;
  description?: string;
  amount: number; // cents, positive
  type: TransactionType;
}

export function buildRows(
  records: Record<string, string>[],
  headers: string[],
  roles: ColumnRole[],
): ParsedRow[] {
  const roleOf = (role: ColumnRole) => headers[roles.indexOf(role)];
  const dateCol = roleOf("date");
  const merchantCol = roleOf("merchant");
  const descCol = roleOf("description");
  const amtCol = roleOf("amount");
  const outCol = roleOf("amount_out");
  const inCol = roleOf("amount_in");

  return records.map((rec) => {
    const dateRaw = dateCol ? rec[dateCol] ?? "" : "";
    const date = parseDate(dateRaw);
    const merchant = (merchantCol ? rec[merchantCol] : "")?.trim() || (descCol ? rec[descCol]?.trim() : "") || "Unknown";
    const description = descCol && descCol !== merchantCol ? rec[descCol]?.trim() || undefined : undefined;

    let cents = 0;
    let type: TransactionType = "expense";
    if (amtCol) {
      cents = toCents(rec[amtCol] ?? "0");
      type = cents >= 0 ? "income" : "expense";
      cents = Math.abs(cents);
    } else {
      const out = outCol ? Math.abs(toCents(rec[outCol] ?? "0")) : 0;
      const inc = inCol ? Math.abs(toCents(rec[inCol] ?? "0")) : 0;
      if (inc > 0) {
        cents = inc;
        type = "income";
      } else {
        cents = out;
        type = "expense";
      }
    }

    if (!date) return { ok: false, reason: "Unrecognised date", date: dateRaw, merchant, description, amount: cents, type };
    if (cents === 0) return { ok: false, reason: "No amount", date, merchant, description, amount: 0, type };
    return { ok: true, date, merchant, description, amount: cents, type };
  });
}

export interface ImportOutcome {
  transactions: Transaction[];
  skippedInvalid: number;
}

export function rowsToTransactions(
  rows: ParsedRow[],
  accountId: string,
  rules: CategorizationRule[],
): ImportOutcome {
  const now = new Date().toISOString();
  const transactions: Transaction[] = [];
  let skippedInvalid = 0;
  for (const r of rows) {
    if (!r.ok) {
      skippedInvalid++;
      continue;
    }
    const res = categorize({ merchant: r.merchant, description: r.description, type: r.type }, rules);
    const base = {
      id: uid("txn"),
      accountId,
      date: r.date,
      merchant: r.merchant,
      description: r.description,
      amount: r.amount,
      type: r.type,
      categoryId: res.categoryId,
      categorySource: res.source,
      categoryConfidence: res.confidence,
      reviewed: res.source !== "uncategorized",
      tags: [],
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<Transaction, "importHash">;
    transactions.push({ ...base, importHash: computeImportHash(base) });
  }
  return { transactions, skippedInvalid };
}
