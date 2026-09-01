import { describe, it, expect } from "vitest";
import { categorize, recategorize } from "./engine";
import { rule, txn } from "@/test/factories";

describe("categorize", () => {
  it("matches built-in Canadian merchants", () => {
    expect(categorize({ merchant: "LOBLAWS #1234", type: "expense" }, []).categoryId).toBe("groceries");
    expect(categorize({ merchant: "TIM HORTONS", type: "expense" }, []).categoryId).toBe("restaurants");
    expect(categorize({ merchant: "UBER *TRIP", type: "expense" }, []).categoryId).toBe("transportation");
    expect(categorize({ merchant: "NETFLIX.COM", type: "expense" }, []).categoryId).toBe("subscriptions");
    expect(categorize({ merchant: "ESSO", type: "expense" }, []).categoryId).toBe("transportation");
  });

  it("user rules win over the built-in table, highest priority first", () => {
    const rules = [
      rule({ field: "merchant", op: "contains", value: "loblaws", categoryId: "shopping", priority: 10 }),
      rule({ field: "merchant", op: "contains", value: "loblaws", categoryId: "personal", priority: 99 }),
    ];
    expect(categorize({ merchant: "Loblaws Market", type: "expense" }, rules)).toMatchObject({
      categoryId: "personal",
      source: "rule",
    });
  });

  it("disabled rules are ignored", () => {
    const rules = [rule({ value: "loblaws", categoryId: "shopping", enabled: false })];
    expect(categorize({ merchant: "Loblaws", type: "expense" }, rules).categoryId).toBe("groceries");
  });

  it("respects the match operator", () => {
    expect(categorize({ merchant: "AMZN Mktp", type: "expense" }, [rule({ op: "equals", value: "amzn mktp", categoryId: "shopping" })]).categoryId).toBe("shopping");
    expect(categorize({ merchant: "AMZN Mktp CA", type: "expense" }, [rule({ op: "equals", value: "amzn mktp", categoryId: "shopping" })]).categoryId).not.toBe("shopping");
    expect(categorize({ merchant: "STARBUCKS 401", type: "expense" }, [rule({ op: "starts_with", value: "starbucks", categoryId: "personal" })]).categoryId).toBe("personal");
  });

  it("transfers are always the transfer category", () => {
    expect(categorize({ merchant: "anything", type: "transfer" }, [])).toMatchObject({ categoryId: "transfer" });
  });

  it("unknown expense merchants land in review as uncategorized", () => {
    const res = categorize({ merchant: "SQ *THE CORNER SHOP", type: "expense" }, []);
    expect(res).toMatchObject({ categoryId: "other", source: "uncategorized", confidence: 0 });
  });

  it("income without a match falls back to the income category", () => {
    expect(categorize({ merchant: "Some Client Payment", type: "income" }, [])).toMatchObject({ categoryId: "income" });
  });
});

describe("recategorize", () => {
  it("re-runs rules but never overrides a manual choice", () => {
    const list = [
      txn({ merchant: "Loblaws", categoryId: "other", categorySource: "auto" }),
      txn({ merchant: "Loblaws", categoryId: "entertainment", categorySource: "manual" }),
    ];
    const out = recategorize(list, []);
    expect(out[0].categoryId).toBe("groceries");
    expect(out[1].categoryId).toBe("entertainment"); // manual preserved
  });
  it("returns the same object references for unchanged rows", () => {
    const list = [txn({ merchant: "Loblaws", categoryId: "groceries", categorySource: "auto", categoryConfidence: 0.9 })];
    const out = recategorize(list, []);
    expect(out[0]).toBe(list[0]);
  });
});
