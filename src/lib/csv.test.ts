import { describe, it, expect } from "vitest";
import { parseDate, guessRoles, buildRows, rowsToTransactions, type ColumnRole } from "./csv";

describe("parseDate", () => {
  it("passes through ISO", () => {
    expect(parseDate("2026-08-02")).toBe("2026-08-02");
    expect(parseDate("2026-08-02T12:00:00Z")).toBe("2026-08-02");
  });
  it("handles slash / dash / dot separators and 2-digit years", () => {
    expect(parseDate("02/08/2026")).toBe("2026-08-02"); // day-first when ambiguous
    expect(parseDate("13/08/2026")).toBe("2026-08-13"); // day > 12 forces day-first
    expect(parseDate("08-13-2026")).toBe("2026-08-13"); // month-first when 2nd > 12
    expect(parseDate("2-8-26")).toBe("2026-08-02");
  });
  it("returns null for unparseable input", () => {
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("guessRoles", () => {
  it("maps common bank-export headers", () => {
    expect(guessRoles(["Date", "Description", "Amount"])).toEqual(["date", "merchant", "amount"]);
    expect(guessRoles(["Transaction Date", "Details", "Debit", "Credit"])).toEqual([
      "date",
      "merchant",
      "amount_out",
      "amount_in",
    ]);
  });
});

describe("buildRows", () => {
  const headers = ["Date", "Description", "Amount"];
  const roles: ColumnRole[] = ["date", "merchant", "amount"];
  it("parses a signed-amount export, inferring type from sign", () => {
    const rows = buildRows(
      [
        { Date: "2026-08-02", Description: "LOBLAWS", Amount: "-84.21" },
        { Date: "2026-08-05", Description: "PAYROLL", Amount: "2985.40" },
      ],
      headers,
      roles,
    );
    expect(rows[0]).toMatchObject({ ok: true, merchant: "LOBLAWS", amount: 8421, type: "expense" });
    expect(rows[1]).toMatchObject({ ok: true, amount: 298540, type: "income" });
  });
  it("handles split debit / credit columns", () => {
    const rows = buildRows(
      [
        { Date: "2026-08-02", Name: "ESSO", Out: "61.40", In: "" },
        { Date: "2026-08-03", Name: "REFUND", Out: "", In: "20.00" },
      ],
      ["Date", "Name", "Out", "In"],
      ["date", "merchant", "amount_out", "amount_in"],
    );
    expect(rows[0]).toMatchObject({ amount: 6140, type: "expense" });
    expect(rows[1]).toMatchObject({ amount: 2000, type: "income" });
  });
  it("marks rows with an unreadable date or zero amount as not ok", () => {
    const rows = buildRows(
      [
        { Date: "??", Description: "X", Amount: "-5.00" },
        { Date: "2026-08-02", Description: "Y", Amount: "0" },
      ],
      headers,
      roles,
    );
    expect(rows[0].ok).toBe(false);
    expect(rows[1].ok).toBe(false);
  });
});

describe("rowsToTransactions", () => {
  it("categorizes, stamps an import hash, and skips invalid rows", () => {
    const rows = buildRows(
      [
        { Date: "2026-08-02", Description: "NETFLIX.COM", Amount: "-22.99" },
        { Date: "bad", Description: "X", Amount: "-1.00" },
      ],
      ["Date", "Description", "Amount"],
      ["date", "merchant", "amount"],
    );
    const { transactions, skippedInvalid } = rowsToTransactions(rows, "acc-1", []);
    expect(skippedInvalid).toBe(1);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ categoryId: "subscriptions", accountId: "acc-1", amount: 2299 });
    expect(transactions[0].importHash).toBeTruthy();
  });
});
