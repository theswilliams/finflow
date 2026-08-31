import type { Transaction } from "../types";

/** Stable key for CSV duplicate detection: same day, amount, direction, merchant and account. */
export function computeImportHash(
  t: Pick<Transaction, "date" | "amount" | "merchant" | "accountId" | "type">,
): string {
  return [t.date, t.amount, t.type, t.merchant.trim().toLowerCase(), t.accountId].join("|");
}
