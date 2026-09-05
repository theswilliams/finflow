import type { CategorizationRule, CategoryId, Transaction } from "../types";

/** Built-in merchant keyword map -> category. Lower priority than user rules. */
export const DEFAULT_MERCHANT_RULES: { match: string; category: CategoryId }[] = [
  // Groceries
  { match: "loblaws", category: "groceries" },
  { match: "no frills", category: "groceries" },
  { match: "nofrills", category: "groceries" },
  { match: "metro", category: "groceries" },
  { match: "sobeys", category: "groceries" },
  { match: "costco", category: "groceries" },
  { match: "farm boy", category: "groceries" },
  { match: "food basics", category: "groceries" },
  { match: "freshco", category: "groceries" },
  { match: "longo", category: "groceries" },
  { match: "walmart", category: "groceries" },
  // Restaurants
  { match: "tim hortons", category: "restaurants" },
  { match: "tim horton", category: "restaurants" },
  { match: "starbucks", category: "restaurants" },
  { match: "mcdonald", category: "restaurants" },
  { match: "a&w", category: "restaurants" },
  { match: "subway", category: "restaurants" },
  { match: "pizza", category: "restaurants" },
  { match: "restaurant", category: "restaurants" },
  { match: "uber eats", category: "restaurants" },
  { match: "doordash", category: "restaurants" },
  { match: "skip the dishes", category: "restaurants" },
  { match: "skipthedishes", category: "restaurants" },
  { match: "the keg", category: "restaurants" },
  { match: "swiss chalet", category: "restaurants" },
  { match: "cafe", category: "restaurants" },
  { match: "coffee", category: "restaurants" },
  // Transportation
  { match: "uber", category: "transportation" },
  { match: "lyft", category: "transportation" },
  { match: "esso", category: "transportation" },
  { match: "shell", category: "transportation" },
  { match: "petro-canada", category: "transportation" },
  { match: "petro canada", category: "transportation" },
  { match: "circle k", category: "transportation" },
  { match: "husky", category: "transportation" },
  { match: "pioneer", category: "transportation" },
  { match: "ultramar", category: "transportation" },
  { match: "ttc", category: "transportation" },
  { match: "presto", category: "transportation" },
  { match: "go transit", category: "transportation" },
  { match: "parking", category: "transportation" },
  // Subscriptions
  { match: "netflix", category: "subscriptions" },
  { match: "spotify", category: "subscriptions" },
  { match: "disney+", category: "subscriptions" },
  { match: "disney plus", category: "subscriptions" },
  { match: "crave", category: "subscriptions" },
  { match: "amazon prime", category: "subscriptions" },
  { match: "apple.com/bill", category: "subscriptions" },
  { match: "youtube premium", category: "subscriptions" },
  { match: "icloud", category: "subscriptions" },
  { match: "google storage", category: "subscriptions" },
  { match: "audible", category: "subscriptions" },
  { match: "dropbox", category: "subscriptions" },
  { match: "notion", category: "subscriptions" },
  { match: "chatgpt", category: "subscriptions" },
  { match: "openai", category: "subscriptions" },
  // Utilities
  { match: "bell", category: "utilities" },
  { match: "rogers", category: "utilities" },
  { match: "telus", category: "utilities" },
  { match: "freedom mobile", category: "utilities" },
  { match: "enbridge", category: "utilities" },
  { match: "hydro", category: "utilities" },
  { match: "toronto hydro", category: "utilities" },
  { match: "alectra", category: "utilities" },
  // Shopping
  { match: "amazon", category: "shopping" },
  { match: "canadian tire", category: "shopping" },
  { match: "best buy", category: "shopping" },
  { match: "the bay", category: "shopping" },
  { match: "hudson", category: "shopping" },
  { match: "winners", category: "shopping" },
  { match: "ikea", category: "shopping" },
  { match: "indigo", category: "shopping" },
  { match: "sportchek", category: "shopping" },
  { match: "sport chek", category: "shopping" },
  { match: "lululemon", category: "shopping" },
  { match: "roots", category: "shopping" },
  { match: "shoppers drug mart", category: "health" },
  // Entertainment
  { match: "cineplex", category: "entertainment" },
  { match: "steam", category: "entertainment" },
  { match: "playstation", category: "entertainment" },
  { match: "nintendo", category: "entertainment" },
  { match: "ticketmaster", category: "entertainment" },
  { match: "livenation", category: "entertainment" },
  // Health
  { match: "pharmacy", category: "health" },
  { match: "rexall", category: "health" },
  { match: "dental", category: "health" },
  { match: "physio", category: "health" },
  { match: "goodlife", category: "health" },
  { match: "fitness", category: "health" },
  // Housing
  { match: "rent", category: "housing" },
  { match: "mortgage", category: "housing" },
  { match: "property management", category: "housing" },
  { match: "property mgmt", category: "housing" },
  { match: "condo fee", category: "housing" },
  { match: "landlord", category: "housing" },
  // Travel
  { match: "air canada", category: "travel" },
  { match: "westjet", category: "travel" },
  { match: "porter airlines", category: "travel" },
  { match: "airbnb", category: "travel" },
  { match: "expedia", category: "travel" },
  { match: "booking.com", category: "travel" },
  { match: "hotel", category: "travel" },
  // Income
  { match: "payroll", category: "income" },
  { match: "direct deposit", category: "income" },
  { match: "e-transfer received", category: "income" },
  { match: "interest paid", category: "income" },
  { match: "cra", category: "income" },
];

export interface CategorizationResult {
  categoryId: CategoryId;
  source: "rule" | "auto" | "uncategorized";
  confidence: number;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** whole-token match: `esso` hits "ESSO CIRCLE K" but not "accessories" */
function containsToken(haystack: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

function ruleMatches(rule: CategorizationRule, merchant: string, description: string): boolean {
  const hay = normalize(rule.field === "merchant" ? merchant : description);
  const needle = normalize(rule.value);
  if (!needle) return false;
  if (rule.op === "equals") return hay === needle;
  if (rule.op === "starts_with") return hay.startsWith(needle);
  return hay.includes(needle);
}

/**
 * Resolve a category for a transaction.
 *  1. user rules (highest priority first)
 *  2. built-in merchant keyword table
 *  3. income/transfer type fallbacks
 *  4. uncategorized -> "other" with source "uncategorized" (goes to review queue)
 */
export function categorize(
  input: { merchant: string; description?: string; type: "expense" | "income" | "transfer" },
  rules: CategorizationRule[],
): CategorizationResult {
  const merchant = input.merchant ?? "";
  const description = input.description ?? "";

  if (input.type === "transfer") return { categoryId: "transfer", source: "auto", confidence: 1 };

  const active = [...rules].filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);
  for (const rule of active) {
    if (ruleMatches(rule, merchant, description)) {
      return { categoryId: rule.categoryId, source: "rule", confidence: 1 };
    }
  }

  const hay = normalize(`${merchant} ${description}`);
  for (const entry of DEFAULT_MERCHANT_RULES) {
    if (containsToken(hay, entry.match)) {
      if (input.type === "income" && entry.category !== "income") continue;
      return { categoryId: entry.category, source: "auto", confidence: 0.9 };
    }
  }

  if (input.type === "income") return { categoryId: "income", source: "auto", confidence: 0.6 };

  return { categoryId: "other", source: "uncategorized", confidence: 0 };
}

/** Re-run categorization over a set of transactions, preserving manual choices. */
export function recategorize(txns: Transaction[], rules: CategorizationRule[]): Transaction[] {
  return txns.map((t) => {
    if (t.categorySource === "manual") return t;
    const res = categorize({ merchant: t.merchant, description: t.description, type: t.type }, rules);
    if (res.categoryId === t.categoryId && res.source === t.categorySource) return t;
    return {
      ...t,
      categoryId: res.categoryId,
      categorySource: res.source,
      categoryConfidence: res.confidence,
      reviewed: res.source === "uncategorized" ? false : t.reviewed,
      updatedAt: new Date().toISOString(),
    };
  });
}
