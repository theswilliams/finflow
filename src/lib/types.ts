// ------------------------------------------------------------------
//  Domain model. All monetary values are integer cents (CAD by default).
// ------------------------------------------------------------------

export type CurrencyCode = "CAD" | "USD" | "EUR" | "GBP";

export type AccountType =
  | "chequing"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan";

export type TransactionType = "expense" | "income" | "transfer";

export type CategoryId =
  | "housing"
  | "transportation"
  | "groceries"
  | "restaurants"
  | "shopping"
  | "entertainment"
  | "utilities"
  | "subscriptions"
  | "health"
  | "travel"
  | "personal"
  | "income"
  | "transfer"
  | "other";

export interface Category {
  id: CategoryId;
  name: string;
  /** css custom property token, e.g. "--cat-groceries" */
  colorVar: string;
  kind: "expense" | "income" | "transfer";
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  /** opening balance in cents; live balance is opening + sum(signed txns) */
  openingBalance: number;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  /** ISO date (yyyy-mm-dd) */
  date: string;
  merchant: string;
  description?: string;
  /** absolute value in cents, always positive */
  amount: number;
  type: TransactionType;
  categoryId: CategoryId;
  /** for transfers: the counterpart account */
  transferAccountId?: string;
  notes?: string;
  tags: string[];
  reviewed: boolean;
  /** how the current category was assigned */
  categorySource: "manual" | "rule" | "auto" | "uncategorized";
  /** confidence 0..1 from the auto categorizer */
  categoryConfidence?: number;
  /** stable hash used for CSV duplicate detection */
  importHash?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RuleMatchField = "merchant" | "description";
export type RuleMatchOp = "contains" | "equals" | "starts_with";

export interface CategorizationRule {
  id: string;
  field: RuleMatchField;
  op: RuleMatchOp;
  value: string;
  categoryId: CategoryId;
  /** higher wins */
  priority: number;
  enabled: boolean;
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: CategoryId;
  /** monthly limit in cents */
  limit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  accentVar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceData {
  version: number;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  rules: CategorizationRule[];
  seededDemo: boolean;
  seedVersion?: number;
  /** demo datasets pin the app's "today" here so every screen shows a full month */
  referenceDate?: string;
}
