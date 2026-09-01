import { describe, it, expect } from "vitest";
import { merchantStats, detectRecurring, detectAnomalies } from "./insights";
import { txn } from "@/test/factories";

describe("merchantStats", () => {
  it("ranks merchants by total expense spend", () => {
    const stats = merchantStats([
      txn({ merchant: "Amazon", type: "expense", amount: 5000 }),
      txn({ merchant: "Amazon", type: "expense", amount: 3000 }),
      txn({ merchant: "Loblaws", type: "expense", amount: 6000 }),
      txn({ merchant: "Amazon", type: "income", amount: 999999 }), // ignored
    ]);
    expect(stats[0]).toMatchObject({ merchant: "Amazon", total: 8000, count: 2, avg: 4000 });
    expect(stats[1].merchant).toBe("Loblaws");
  });
});

describe("detectRecurring", () => {
  it("detects a monthly subscription with a stable amount", () => {
    const months = ["2026-03-04", "2026-04-04", "2026-05-04", "2026-06-04", "2026-07-04"];
    const txns = months.map((d) => txn({ merchant: "Netflix", categoryId: "subscriptions", type: "expense", amount: 2299, date: d }));
    const rec = detectRecurring(txns);
    expect(rec).toHaveLength(1);
    expect(rec[0]).toMatchObject({ merchant: "Netflix", frequency: "monthly", typicalAmount: 2299 });
    expect(rec[0].estimatedAnnual).toBe(2299 * 12);
  });
  it("ignores merchants with too few occurrences or an irregular amount", () => {
    expect(detectRecurring([txn({ merchant: "X", date: "2026-01-01" }), txn({ merchant: "X", date: "2026-02-01" })])).toHaveLength(0);
    const wild = ["2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"].map((d, i) =>
      txn({ merchant: "Groceries", type: "expense", amount: 1000 + i * 9000, date: d }),
    );
    expect(detectRecurring(wild)).toHaveLength(0);
  });
});

describe("detectAnomalies", () => {
  it("flags a category well above its trailing average, conservatively", () => {
    const prior = ["2026-03", "2026-04", "2026-05"].flatMap((m) => [
      txn({ type: "expense", categoryId: "shopping", amount: 10000, date: `${m}-10` }),
    ]);
    const current = [txn({ type: "expense", categoryId: "shopping", amount: 25000, date: "2026-06-10" })];
    const anomalies = detectAnomalies([...prior, ...current], "2026-06");
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].categoryId).toBe("shopping");
    expect(Math.round(anomalies[0].pctOver)).toBe(150);
  });
  it("does not flag small categories or normal variation", () => {
    const prior = ["2026-03", "2026-04", "2026-05"].map((m) =>
      txn({ type: "expense", categoryId: "personal", amount: 1000, date: `${m}-10` }),
    );
    const current = [txn({ type: "expense", categoryId: "personal", amount: 5000, date: "2026-06-10" })];
    expect(detectAnomalies([...prior, ...current], "2026-06")).toHaveLength(0); // avg < $50/mo
  });
});
