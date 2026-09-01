import { describe, it, expect } from "vitest";
import { computeImportHash } from "./hash";

const base = { date: "2026-06-15", amount: 4210, type: "expense" as const, merchant: "Loblaws #1234", accountId: "acc-1" };

describe("computeImportHash", () => {
  it("is stable for the same logical transaction", () => {
    expect(computeImportHash(base)).toBe(computeImportHash({ ...base }));
  });
  it("normalises merchant case and surrounding whitespace", () => {
    expect(computeImportHash(base)).toBe(computeImportHash({ ...base, merchant: "  LOBLAWS #1234  " }));
  });
  it("differs when any identifying field changes", () => {
    expect(computeImportHash(base)).not.toBe(computeImportHash({ ...base, amount: 4211 }));
    expect(computeImportHash(base)).not.toBe(computeImportHash({ ...base, date: "2026-06-16" }));
    expect(computeImportHash(base)).not.toBe(computeImportHash({ ...base, accountId: "acc-2" }));
    expect(computeImportHash(base)).not.toBe(computeImportHash({ ...base, type: "income" }));
  });
});
