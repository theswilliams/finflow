import type { CurrencyCode } from "../types";

/**
 * Parse a user-entered amount string ("$1,299.50") into integer cents.
 * Works on the decimal string rather than `parseFloat(x) * 100` so values like
 * "35.355" don't fall victim to binary-float representation.
 */
export function toCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (!/\d/.test(cleaned)) return 0;
  const negative = cleaned.trimStart().startsWith("-");
  const [intPart = "0", fracPart = ""] = cleaned.replace(/-/g, "").split(".");
  const frac = (fracPart + "000").slice(0, 3); // three digits, zero-padded
  const cents = Number(intPart || "0") * 100 + Math.round(Number(frac) / 10);
  return negative ? -cents : cents;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatter(currency: CurrencyCode, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = currency + JSON.stringify(opts);
  let f = FORMATTERS.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-CA", { style: "currency", currency, ...opts });
    FORMATTERS.set(key, f);
  }
  return f;
}

/** Format integer cents as currency. Presentation layer only. */
export function formatMoney(
  cents: number,
  currency: CurrencyCode = "CAD",
  { showCents = true, signed = false, compact = false }: { showCents?: boolean; signed?: boolean; compact?: boolean } = {},
): string {
  const value = cents / 100;
  const f = formatter(currency, {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
    notation: compact ? "compact" : "standard",
  });
  const out = f.format(Math.abs(value));
  if (signed && cents !== 0) return `${cents > 0 ? "+" : "−"}${out}`;
  if (cents < 0) return `−${out}`;
  return out;
}

/** Signed effect of a transaction on net cash flow (income +, expense -, transfer 0). */
export function signedCashFlow(type: "expense" | "income" | "transfer", amount: number): number {
  if (type === "income") return amount;
  if (type === "expense") return -amount;
  return 0;
}
