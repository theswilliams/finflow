import { describe, expect, it } from "vitest";
import { MAX_IMPORT_BYTES, parseFinanceData } from "./importSchema";
import { buildDemoData } from "./seed";

describe("parseFinanceData", () => {
  it("accepts a real export (the built-in demo dataset round-trips)", () => {
    const demo = buildDemoData();
    const parsed = parseFinanceData(JSON.stringify(demo));
    expect(parsed.transactions).toHaveLength(demo.transactions.length);
    expect(parsed.accounts).toHaveLength(demo.accounts.length);
  });

  it.each([
    ["not JSON", "not json {"],
    ["an array", "[]"],
    ["an empty object", "{}"],
    ["null", "null"],
  ])("rejects %s with a friendly error", (_n, raw) => {
    expect(() => parseFinanceData(raw)).toThrow(/valid (JSON|FinFlow export)/);
  });

  it("rejects wrong types and out-of-range values", () => {
    const d = buildDemoData();
    const bad = { ...d, transactions: [{ ...d.transactions[0], amount: -5 }] };
    expect(() => parseFinanceData(JSON.stringify(bad))).toThrow(/valid FinFlow export/);
    const badFloat = { ...d, transactions: [{ ...d.transactions[0], amount: 12.5 }] };
    expect(() => parseFinanceData(JSON.stringify(badFloat))).toThrow(/valid FinFlow export/);
  });

  it("rejects transactions that reference an unknown account", () => {
    const d = buildDemoData();
    const bad = { ...d, transactions: [{ ...d.transactions[0], accountId: "nope" }] };
    expect(() => parseFinanceData(JSON.stringify(bad))).toThrow(/unknown account/);
  });

  it("rejects a transfer to the same account", () => {
    const d = buildDemoData();
    const t = { ...d.transactions[0], type: "transfer", transferAccountId: d.transactions[0].accountId };
    expect(() => parseFinanceData(JSON.stringify({ ...d, transactions: [t] }))).toThrow(/source account/);
  });

  it("rejects unknown categories and oversized files", () => {
    const d = buildDemoData();
    const bad = { ...d, transactions: [{ ...d.transactions[0], categoryId: "crypto" }] };
    expect(() => parseFinanceData(JSON.stringify(bad))).toThrow(/valid FinFlow export/);
    expect(() => parseFinanceData("x".repeat(MAX_IMPORT_BYTES + 1))).toThrow(/too large/);
  });

  it("strips unknown fields instead of passing them through", () => {
    const d = buildDemoData();
    const withExtra = { ...d, __proto__polluter: { x: 1 }, transactions: d.transactions.slice(0, 1).map((t) => ({ ...t, evil: "<script>" })) };
    const parsed = parseFinanceData(JSON.stringify(withExtra));
    expect((parsed.transactions[0] as unknown as Record<string, unknown>).evil).toBeUndefined();
    expect((parsed as unknown as Record<string, unknown>).__proto__polluter).toBeUndefined();
  });
});
