import { describe, it, expect } from "vitest";
import { toCents, fromCents, formatMoney, signedCashFlow } from "./money";

describe("toCents", () => {
  it("parses plain and formatted amounts", () => {
    expect(toCents("12.99")).toBe(1299);
    expect(toCents("$1,299.50")).toBe(129950);
    expect(toCents("1000")).toBe(100000);
    expect(toCents("-45.10")).toBe(-4510);
    expect(toCents(12.99)).toBe(1299);
  });
  it("rounds to the nearest cent (no float drift)", () => {
    expect(toCents("0.1")).toBe(10);
    expect(toCents("19.999")).toBe(2000);
    expect(toCents("35.355")).toBe(3536);
  });
  it("returns 0 for empty / junk input", () => {
    expect(toCents("")).toBe(0);
    expect(toCents("abc")).toBe(0);
    expect(toCents("-")).toBe(0);
    expect(toCents(".")).toBe(0);
  });
});

describe("fromCents", () => {
  it("is the inverse of toCents for representable values", () => {
    expect(fromCents(1299)).toBe(12.99);
    expect(fromCents(toCents("500.00"))).toBe(500);
  });
});

describe("formatMoney", () => {
  it("formats CAD with cents by default", () => {
    expect(formatMoney(129950)).toBe("$1,299.50");
  });
  it("hides cents when asked", () => {
    expect(formatMoney(129950, "CAD", { showCents: false })).toBe("$1,300");
  });
  it("uses a real minus sign for negatives", () => {
    expect(formatMoney(-500)).toBe("−$5.00");
  });
  it("adds an explicit sign when signed and non-zero", () => {
    expect(formatMoney(500, "CAD", { signed: true })).toBe("+$5.00");
    expect(formatMoney(-500, "CAD", { signed: true })).toBe("−$5.00");
    expect(formatMoney(0, "CAD", { signed: true })).toBe("$0.00");
  });
  it("supports compact notation", () => {
    expect(formatMoney(600000, "CAD", { showCents: false, compact: true })).toBe("$6K");
  });
});

describe("signedCashFlow", () => {
  it("income adds, expense subtracts, transfer is neutral", () => {
    expect(signedCashFlow("income", 1000)).toBe(1000);
    expect(signedCashFlow("expense", 1000)).toBe(-1000);
    expect(signedCashFlow("transfer", 1000)).toBe(0);
  });
});
