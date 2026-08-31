import type { Category, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
  { id: "housing", name: "Housing", colorVar: "--cat-housing", kind: "expense" },
  { id: "transportation", name: "Transportation", colorVar: "--cat-transportation", kind: "expense" },
  { id: "groceries", name: "Groceries", colorVar: "--cat-groceries", kind: "expense" },
  { id: "restaurants", name: "Restaurants", colorVar: "--cat-restaurants", kind: "expense" },
  { id: "shopping", name: "Shopping", colorVar: "--cat-shopping", kind: "expense" },
  { id: "entertainment", name: "Entertainment", colorVar: "--cat-entertainment", kind: "expense" },
  { id: "utilities", name: "Utilities", colorVar: "--cat-utilities", kind: "expense" },
  { id: "subscriptions", name: "Subscriptions", colorVar: "--cat-subscriptions", kind: "expense" },
  { id: "health", name: "Health", colorVar: "--cat-health", kind: "expense" },
  { id: "travel", name: "Travel", colorVar: "--cat-travel", kind: "expense" },
  { id: "personal", name: "Personal", colorVar: "--cat-personal", kind: "expense" },
  { id: "income", name: "Income", colorVar: "--cat-income", kind: "income" },
  { id: "transfer", name: "Transfer", colorVar: "--cat-transfer", kind: "transfer" },
  { id: "other", name: "Other", colorVar: "--cat-other", kind: "expense" },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => c.kind === "expense");

export function categoryName(id: CategoryId): string {
  return CATEGORY_MAP[id]?.name ?? "Other";
}

export function categoryColor(id: CategoryId): string {
  return `var(${CATEGORY_MAP[id]?.colorVar ?? "--cat-other"})`;
}
