import { describe, it, expect } from "vitest";
import { EMPTY_FILTER, filterTransactions, sortTransactions, activeFilterCount } from "./filter";
import { txn } from "@/test/factories";

const data = [
  txn({ merchant: "Loblaws", categoryId: "groceries", accountId: "a", type: "expense", amount: 5000, date: "2026-06-01", tags: ["food"], reviewed: true }),
  txn({ merchant: "Uber Eats", categoryId: "restaurants", accountId: "a", type: "expense", amount: 3200, date: "2026-06-10", notes: "team lunch", reviewed: false }),
  txn({ merchant: "Payroll", categoryId: "income", accountId: "b", type: "income", amount: 250000, date: "2026-06-15", reviewed: true }),
  txn({ merchant: "Costco", categoryId: "groceries", accountId: "b", type: "expense", amount: 18000, date: "2026-07-02", reviewed: true }),
];

describe("filterTransactions", () => {
  it("matches search across merchant, description and notes", () => {
    expect(filterTransactions(data, { ...EMPTY_FILTER, search: "loblaws" })).toHaveLength(1);
    expect(filterTransactions(data, { ...EMPTY_FILTER, search: "team lunch" })).toHaveLength(1);
    expect(filterTransactions(data, { ...EMPTY_FILTER, search: "co" }).map((t) => t.merchant)).toEqual(["Costco"]);
  });
  it("filters by category, account and type", () => {
    expect(filterTransactions(data, { ...EMPTY_FILTER, categories: ["groceries"] })).toHaveLength(2);
    expect(filterTransactions(data, { ...EMPTY_FILTER, accounts: ["b"] })).toHaveLength(2);
    expect(filterTransactions(data, { ...EMPTY_FILTER, types: ["income"] })).toHaveLength(1);
  });
  it("filters by amount range (cents) and date range", () => {
    expect(filterTransactions(data, { ...EMPTY_FILTER, minAmount: 10000 })).toHaveLength(2);
    expect(filterTransactions(data, { ...EMPTY_FILTER, maxAmount: 4000 })).toHaveLength(1);
    expect(filterTransactions(data, { ...EMPTY_FILTER, from: "2026-06-05", to: "2026-06-30" })).toHaveLength(2);
  });
  it("filters by tag and review status", () => {
    expect(filterTransactions(data, { ...EMPTY_FILTER, tag: "food" })).toHaveLength(1);
    expect(filterTransactions(data, { ...EMPTY_FILTER, reviewed: "unreviewed" })).toHaveLength(1);
    expect(filterTransactions(data, { ...EMPTY_FILTER, reviewed: "reviewed" })).toHaveLength(3);
  });
  it("combines predicates (AND)", () => {
    const r = filterTransactions(data, { ...EMPTY_FILTER, categories: ["groceries"], accounts: ["b"] });
    expect(r.map((t) => t.merchant)).toEqual(["Costco"]);
  });
});

describe("sortTransactions", () => {
  it("sorts by amount asc/desc", () => {
    expect(sortTransactions(data, "amount", "asc").map((t) => t.amount)).toEqual([3200, 5000, 18000, 250000]);
    expect(sortTransactions(data, "amount", "desc")[0].amount).toBe(250000);
  });
  it("sorts by merchant alphabetically", () => {
    expect(sortTransactions(data, "merchant", "asc").map((t) => t.merchant)).toEqual([
      "Costco",
      "Loblaws",
      "Payroll",
      "Uber Eats",
    ]);
  });
  it("does not mutate the input", () => {
    const copy = [...data];
    sortTransactions(data, "amount", "asc");
    expect(data).toEqual(copy);
  });
});

describe("activeFilterCount", () => {
  it("counts each active dimension once", () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTER, search: "x", categories: ["groceries"] })).toBe(2);
    expect(activeFilterCount({ ...EMPTY_FILTER, minAmount: 100, maxAmount: 200 })).toBe(1);
    expect(activeFilterCount({ ...EMPTY_FILTER, from: "2026-01-01" })).toBe(1);
  });
});
