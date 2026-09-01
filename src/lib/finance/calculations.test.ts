import { describe, it, expect, afterEach } from "vitest";
import {
  summarize,
  pctChange,
  spendByCategory,
  accountBalance,
  budgetStatus,
  dailySpend,
} from "./calculations";
import { setReferenceDate } from "./dates";
import { txn, account, budget } from "@/test/factories";

afterEach(() => setReferenceDate(null));

describe("summarize", () => {
  const txns = [
    txn({ type: "income", amount: 500000, date: "2026-06-15" }),
    txn({ type: "expense", amount: 120000, date: "2026-06-10" }),
    txn({ type: "expense", amount: 80000, date: "2026-06-20" }),
    txn({ type: "transfer", amount: 60000, date: "2026-06-16" }),
    txn({ type: "expense", amount: 9999, date: "2026-05-30" }),
  ];
  it("nets income minus expenses, ignoring transfers", () => {
    const s = summarize(txns, "2026-06");
    expect(s.income).toBe(500000);
    expect(s.expenses).toBe(200000);
    expect(s.net).toBe(300000);
    expect(s.transferVolume).toBe(60000);
    expect(s.txnCount).toBe(4);
  });
  it("without a month key, sums everything", () => {
    expect(summarize(txns).expenses).toBe(209999);
  });
});

describe("pctChange", () => {
  it("computes percentage change", () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(90, 100)).toBe(-10);
  });
  it("handles a zero base", () => {
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(50, 0)).toBeNull();
  });
});

describe("spendByCategory", () => {
  it("aggregates expense amount, count and share, sorted desc", () => {
    const rows = spendByCategory(
      [
        txn({ type: "expense", categoryId: "groceries", amount: 8000, date: "2026-06-01" }),
        txn({ type: "expense", categoryId: "groceries", amount: 2000, date: "2026-06-05" }),
        txn({ type: "expense", categoryId: "restaurants", amount: 5000, date: "2026-06-07" }),
        txn({ type: "income", categoryId: "income", amount: 999999, date: "2026-06-15" }),
      ],
      "2026-06",
    );
    expect(rows[0]).toMatchObject({ categoryId: "groceries", amount: 10000, count: 2 });
    expect(rows[0].share).toBeCloseTo(10000 / 15000);
    expect(rows).toHaveLength(2); // income excluded
  });
});

describe("accountBalance", () => {
  it("opening balance plus signed transactions, with transfers moving between accounts", () => {
    const cheq = account({ id: "cheq", openingBalance: 100000 });
    const sav = account({ id: "sav", type: "savings", openingBalance: 0 });
    const txns = [
      txn({ accountId: "cheq", type: "income", amount: 300000 }),
      txn({ accountId: "cheq", type: "expense", amount: 50000 }),
      txn({ accountId: "cheq", transferAccountId: "sav", type: "transfer", amount: 120000 }),
    ];
    expect(accountBalance(cheq, txns)).toBe(100000 + 300000 - 50000 - 120000);
    expect(accountBalance(sav, txns)).toBe(120000);
  });
});

describe("budgetStatus", () => {
  it("classifies healthy / warning / over and projects to month end", () => {
    setReferenceDate("2026-06-15"); // half way through a 30-day month
    const b = budget({ categoryId: "groceries", limit: 60000 });
    const spend = [
      txn({ type: "expense", categoryId: "groceries", amount: 20000, date: "2026-06-05" }),
      txn({ type: "expense", categoryId: "groceries", amount: 10000, date: "2026-06-12" }),
    ];
    const s = budgetStatus(b, spend, "2026-06");
    expect(s.spent).toBe(30000);
    expect(s.remaining).toBe(30000);
    expect(s.state).toBe("healthy");
    expect(s.projected).toBe(60000); // 30k in 15/30 days -> 60k projected
  });
  it("flags over budget", () => {
    setReferenceDate("2026-06-30");
    const s = budgetStatus(budget({ limit: 10000 }), [txn({ type: "expense", categoryId: "groceries", amount: 15000, date: "2026-06-10" })], "2026-06");
    expect(s.state).toBe("over");
    expect(s.remaining).toBe(-5000);
  });
});

describe("dailySpend", () => {
  it("returns one point per day with a running cumulative total", () => {
    setReferenceDate("2026-06-30");
    const pts = dailySpend(
      [
        txn({ type: "expense", amount: 1000, date: "2026-06-01" }),
        txn({ type: "expense", amount: 500, date: "2026-06-01" }),
        txn({ type: "expense", amount: 2000, date: "2026-06-03" }),
      ],
      "2026-06",
    );
    expect(pts).toHaveLength(30);
    expect(pts[0]).toMatchObject({ date: "2026-06-01", spent: 1500, cumulative: 1500 });
    expect(pts[2]).toMatchObject({ date: "2026-06-03", cumulative: 3500 });
    expect(pts[29].cumulative).toBe(3500);
  });
  it("stops the cumulative line after today for the current month", () => {
    setReferenceDate("2026-06-10");
    const pts = dailySpend([txn({ type: "expense", amount: 1000, date: "2026-06-05" })], "2026-06");
    expect(Number.isNaN(pts[14].cumulative)).toBe(true); // day 15 is in the future
  });
});
