import type { Account, Budget, CategorizationRule, FinanceData, Goal, Transaction } from "./types";
import { categorize } from "./categorization/engine";
import { isoDate } from "./finance/dates";
import { uid } from "./utils";

// Deterministic PRNG so the demo dataset is stable across reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260831);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (min: number, max: number) => min + rnd() * (max - min);
const cents = (dollars: number) => Math.round(dollars * 100);

interface SeedMerchant {
  name: string;
  min: number;
  max: number;
  account: "chequing" | "credit";
}

const GROCERS: SeedMerchant[] = [
  { name: "Loblaws", min: 40, max: 180, account: "credit" },
  { name: "No Frills", min: 25, max: 120, account: "credit" },
  { name: "Costco Wholesale", min: 120, max: 340, account: "credit" },
  { name: "Farm Boy", min: 18, max: 90, account: "credit" },
  { name: "Metro", min: 22, max: 110, account: "credit" },
];
const RESTAURANTS: SeedMerchant[] = [
  { name: "Tim Hortons", min: 4, max: 18, account: "credit" },
  { name: "Starbucks", min: 5, max: 22, account: "credit" },
  { name: "SkipTheDishes", min: 24, max: 62, account: "credit" },
  { name: "The Keg Steakhouse", min: 70, max: 190, account: "credit" },
  { name: "Pizza Nova", min: 20, max: 55, account: "credit" },
  { name: "A&W Canada", min: 9, max: 26, account: "credit" },
];
const TRANSPORT: SeedMerchant[] = [
  { name: "Esso", min: 45, max: 95, account: "credit" },
  { name: "Petro-Canada", min: 40, max: 90, account: "credit" },
  { name: "Uber", min: 12, max: 44, account: "credit" },
  { name: "Presto Transit", min: 20, max: 60, account: "chequing" },
  { name: "Green P Parking", min: 6, max: 28, account: "credit" },
];
const SHOPPING: SeedMerchant[] = [
  { name: "Amazon.ca", min: 15, max: 220, account: "credit" },
  { name: "Canadian Tire", min: 20, max: 160, account: "credit" },
  { name: "Best Buy", min: 40, max: 400, account: "credit" },
  { name: "Winners", min: 25, max: 120, account: "credit" },
  { name: "Indigo", min: 18, max: 75, account: "credit" },
  { name: "Lululemon", min: 60, max: 210, account: "credit" },
];
const ENTERTAINMENT: SeedMerchant[] = [
  { name: "Cineplex", min: 24, max: 68, account: "credit" },
  { name: "Steam Games", min: 15, max: 75, account: "credit" },
  { name: "Ticketmaster", min: 55, max: 240, account: "credit" },
];
const HEALTH: SeedMerchant[] = [
  { name: "Shoppers Drug Mart", min: 12, max: 70, account: "credit" },
  { name: "GoodLife Fitness", min: 0, max: 0, account: "chequing" },
  { name: "Rexall", min: 10, max: 55, account: "credit" },
];
const PERSONAL: SeedMerchant[] = [
  { name: "Great Clips", min: 22, max: 40, account: "credit" },
  { name: "Chatters Salon", min: 45, max: 120, account: "credit" },
];

interface Sub {
  name: string;
  amount: number;
  day: number;
  category: "subscriptions" | "utilities" | "housing" | "health";
  account: "chequing" | "credit";
}

const SUBSCRIPTIONS: Sub[] = [
  { name: "Netflix", amount: 22.99, day: 4, category: "subscriptions", account: "credit" },
  { name: "Spotify Premium", amount: 11.99, day: 9, category: "subscriptions", account: "credit" },
  { name: "Disney+", amount: 12.99, day: 14, category: "subscriptions", account: "credit" },
  { name: "Amazon Prime", amount: 9.99, day: 21, category: "subscriptions", account: "credit" },
  { name: "iCloud+ Storage", amount: 3.99, day: 2, category: "subscriptions", account: "credit" },
  { name: "ChatGPT Plus", amount: 28.0, day: 18, category: "subscriptions", account: "credit" },
  { name: "GoodLife Fitness", amount: 62.99, day: 1, category: "health", account: "chequing" },
];

const RECURRING_BILLS: Sub[] = [
  { name: "Rentmoni Property Mgmt", amount: 2150.0, day: 1, category: "housing", account: "chequing" },
  { name: "Bell Canada", amount: 94.35, day: 8, category: "utilities", account: "chequing" },
  { name: "Rogers Wireless", amount: 78.4, day: 12, category: "utilities", account: "chequing" },
  { name: "Enbridge Gas", amount: 61.2, day: 17, category: "utilities", account: "chequing" },
  { name: "Toronto Hydro", amount: 88.75, day: 23, category: "utilities", account: "chequing" },
];

export function buildDemoData(): FinanceData {
  // Anchor the sample data to the last day of the previous calendar month, so the
  // dashboard always shows one full, complete month (rather than a stub when the
  // real date is early in a month). The store points its reference clock here.
  const real = new Date();
  const now = new Date(real.getFullYear(), real.getMonth(), 0); // day 0 = last day of prev month
  const referenceDate = isoDate(now);

  const chequing: Account = mkAccount("Everyday Chequing", "chequing", "TD Canada Trust", cents(4200));
  const savings: Account = mkAccount("High-Interest Savings", "savings", "EQ Bank", cents(18450));
  const credit: Account = mkAccount("Cashback Visa", "credit_card", "Scotiabank", cents(-1240));
  const invest: Account = mkAccount("TFSA Investing", "investment", "Wealthsimple", cents(32700));
  const cash: Account = mkAccount("Cash Wallet", "cash", undefined, cents(120));
  const accounts = [chequing, savings, credit, invest, cash];
  const acct = (k: "chequing" | "credit") => (k === "chequing" ? chequing.id : credit.id);

  const txns: Transaction[] = [];
  const MONTHS_BACK = 6;
  const start = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, 1);

  // iterate day by day
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    const date = isoDate(d);
    const dom = d.getDate();
    const dow = d.getDay();

    // Salary: 15th and last day of month
    const lastDom = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (dom === 15 || dom === lastDom) {
      txns.push(mkTxn({ accountId: chequing.id, date, merchant: "Northbridge Systems Payroll", description: "Direct Deposit — Payroll", amount: cents(2985 + between(-40, 60)), type: "income" }));
    }
    // small interest on the 1st
    if (dom === 1) {
      txns.push(mkTxn({ accountId: savings.id, date, merchant: "EQ Bank", description: "Interest Paid", amount: cents(between(28, 46)), type: "income" }));
    }
    // monthly transfer to savings after first payday
    if (dom === 16) {
      txns.push(mkTxn({ accountId: chequing.id, transferAccountId: savings.id, date, merchant: "Transfer to Savings", amount: cents(600), type: "transfer" }));
    }
    if (dom === 17) {
      txns.push(mkTxn({ accountId: chequing.id, transferAccountId: invest.id, date, merchant: "Wealthsimple Deposit", amount: cents(400), type: "transfer" }));
    }
    // credit card payment
    if (dom === 3) {
      txns.push(mkTxn({ accountId: chequing.id, transferAccountId: credit.id, date, merchant: "Payment — Scotiabank Visa", amount: cents(between(900, 1500)), type: "transfer" }));
    }

    for (const s of [...SUBSCRIPTIONS, ...RECURRING_BILLS]) {
      if (dom === s.day) {
        txns.push(mkTxn({ accountId: acct(s.account), date, merchant: s.name, description: `${s.name} — monthly`, amount: cents(s.amount), type: "expense" }));
      }
    }

    // groceries: a weekly shop, plus an occasional mid-week top-up
    if (dow === 6 || (dow === 3 && rnd() < 0.4)) {
      const m = rnd() < 0.18 ? GROCERS[2] /* Costco run */ : pick([GROCERS[0], GROCERS[1], GROCERS[3], GROCERS[4]]);
      txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(m.min, m.max * 0.8)), type: "expense" }));
    }
    // coffee / lunch on weekdays
    if (dow >= 1 && dow <= 5 && rnd() < 0.4) {
      const m = pick(RESTAURANTS);
      txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(m.min, Math.min(m.max, 24))), type: "expense" }));
    }
    // weekend dinner out
    if ((dow === 5 || dow === 6) && rnd() < 0.32) {
      const m = pick(RESTAURANTS);
      txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(m.min * 1.4, m.max * 1.2)), type: "expense" }));
    }
    // gas roughly every 10 days
    if (dow === 2 && rnd() < 0.36) {
      const m = pick([TRANSPORT[0], TRANSPORT[1]]);
      txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(42, 78)), type: "expense" }));
    }
    // occasional rideshare / parking / transit top-up
    if (rnd() < 0.06) {
      const m = pick([TRANSPORT[2], TRANSPORT[3], TRANSPORT[4]]);
      txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(m.min, m.max)), type: "expense" }));
    }
    // shopping
    if (rnd() < 0.11) {
      const m = pick(SHOPPING);
      txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(m.min, m.max * 0.7)), type: "expense" }));
    }
    // entertainment
    if (rnd() < 0.055) {
      const m = pick(ENTERTAINMENT);
      txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(m.min, m.max)), type: "expense" }));
    }
    // health / personal
    if (rnd() < 0.05) {
      const m = pick([...HEALTH, ...PERSONAL]);
      if (m.max > 0) txns.push(mkTxn({ accountId: acct(m.account), date, merchant: m.name, amount: cents(between(m.min, m.max)), type: "expense" }));
    }
    // cash withdrawal occasionally
    if (dom === 10) {
      txns.push(mkTxn({ accountId: chequing.id, transferAccountId: cash.id, date, merchant: "ATM Withdrawal", amount: cents(100), type: "transfer" }));
    }
  }

  // A couple of deliberate anomalies in the most recent month
  const thisMonth = isoDate(new Date(now.getFullYear(), now.getMonth(), Math.min(12, now.getDate())));
  txns.push(mkTxn({ accountId: credit.id, date: thisMonth, merchant: "Best Buy", description: "Mechanical keyboard + hub", amount: cents(287.4), type: "expense" }));
  txns.push(mkTxn({ accountId: credit.id, date: isoDate(new Date(now.getFullYear(), now.getMonth(), Math.min(6, now.getDate()))), merchant: "Air Canada", description: "Flights — YYZ to YVR", amount: cents(742.5), type: "expense" }));

  // A few genuinely ambiguous ones for the review queue
  for (let i = 0; i < 7; i++) {
    const day = Math.max(1, now.getDate() - Math.floor(rnd() * 20));
    const date = isoDate(new Date(now.getFullYear(), now.getMonth(), day));
    txns.push(mkTxn({ accountId: credit.id, date, merchant: pick(["SQ *THE MARKET CO", "PAYPAL *DIGITALGOODS", "PADDLE.NET* SETAPP", "ETSY.COM", "SP GENERAL STORE", "POS PURCHASE 4471"]), amount: cents(between(8, 60)), type: "expense" }));
  }

  const rules = defaultRules();
  // apply categorization
  for (const t of txns) {
    const res = categorize({ merchant: t.merchant, description: t.description, type: t.type }, rules);
    t.categoryId = res.categoryId;
    t.categorySource = res.source;
    t.categoryConfidence = res.confidence;
    // confidently matched transactions are considered reviewed; only the genuinely
    // ambiguous ones (unrecognised merchant strings) land in the review queue
    t.reviewed = res.source === "rule" || res.source === "auto";
  }

  txns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const budgets: Budget[] = [
    mkBudget("groceries", 72000),
    mkBudget("restaurants", 34000),
    mkBudget("transportation", 46000),
    mkBudget("shopping", 38000),
    mkBudget("entertainment", 12000),
    mkBudget("subscriptions", 11000),
    mkBudget("utilities", 42000),
    mkBudget("health", 9000),
  ];

  const plusMonths = (n: number): string => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + n);
    return isoDate(d);
  };

  const goals: Goal[] = [
    mkGoal("Emergency Fund", cents(15000), cents(9200), plusMonths(5), "--positive"),
    mkGoal("Japan Trip", cents(8000), cents(2650), plusMonths(11), "--cat-travel"),
    mkGoal("New Car Down Payment", cents(12000), cents(4100), plusMonths(14), "--cat-transportation"),
    mkGoal("Home Down Payment", cents(60000), cents(21800), plusMonths(30), "--cat-housing"),
  ];

  return { version: 1, accounts, transactions: txns, budgets, goals, rules, seededDemo: true, referenceDate };
}


function mkAccount(name: string, type: Account["type"], institution: string | undefined, openingBalance: number): Account {
  const ts = new Date().toISOString();
  return { id: uid("acc"), name, type, institution, openingBalance, currency: "CAD", createdAt: ts, updatedAt: ts };
}

function mkTxn(p: Partial<Transaction> & { accountId: string; date: string; merchant: string; amount: number; type: Transaction["type"] }): Transaction {
  const ts = new Date().toISOString();
  return {
    id: uid("txn"),
    description: undefined,
    categoryId: "other",
    tags: [],
    reviewed: false,
    categorySource: "uncategorized",
    isDemo: true,
    createdAt: ts,
    updatedAt: ts,
    ...p,
  };
}

function mkBudget(categoryId: Budget["categoryId"], limit: number): Budget {
  const ts = new Date().toISOString();
  return { id: uid("bgt"), categoryId, limit, createdAt: ts, updatedAt: ts };
}

function mkGoal(name: string, target: number, current: number, targetDate: string, accentVar: string): Goal {
  const ts = new Date().toISOString();
  return { id: uid("goal"), name, targetAmount: target, currentAmount: current, targetDate, accentVar, createdAt: ts, updatedAt: ts };
}

export function defaultRules(): CategorizationRule[] {
  const base: Omit<CategorizationRule, "id" | "createdAt">[] = [
    { field: "merchant", op: "contains", value: "Amazon", categoryId: "shopping", priority: 50, enabled: true },
    { field: "merchant", op: "contains", value: "Costco", categoryId: "groceries", priority: 50, enabled: true },
    { field: "merchant", op: "contains", value: "GoodLife", categoryId: "health", priority: 60, enabled: true },
  ];
  const ts = new Date().toISOString();
  return base.map((r) => ({ ...r, id: uid("rule"), createdAt: ts }));
}
