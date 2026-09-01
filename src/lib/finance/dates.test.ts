import { describe, it, expect, afterEach } from "vitest";
import {
  isoDate,
  monthKey,
  addMonths,
  monthRange,
  lastMonths,
  daysInMonth,
  currentMonthKey,
  relativeDay,
  setReferenceDate,
  now,
} from "./dates";

afterEach(() => setReferenceDate(null));

describe("isoDate / monthKey", () => {
  it("formats a Date as local yyyy-mm-dd", () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(isoDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
  it("monthKey slices the year-month", () => {
    expect(monthKey("2026-08-17")).toBe("2026-08");
  });
});

describe("addMonths", () => {
  it("moves forward and backward, rolling the year", () => {
    expect(addMonths("2026-08", 1)).toBe("2026-09");
    expect(addMonths("2026-08", -5)).toBe("2026-03");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 3)).toBe("2027-02");
  });
});

describe("monthRange / daysInMonth", () => {
  it("returns the first and last day", () => {
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2024-02").end).toBe("2024-02-29"); // leap year
  });
  it("daysInMonth", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2026-01")).toBe(31);
    expect(daysInMonth("2026-04")).toBe(30);
  });
});

describe("lastMonths", () => {
  it("returns `count` keys oldest→newest ending at the anchor", () => {
    expect(lastMonths(3, "2026-08")).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(lastMonths(6, "2026-02")).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("reference clock", () => {
  it("currentMonthKey / now follow the reference date when set", () => {
    setReferenceDate("2026-08-31");
    expect(currentMonthKey()).toBe("2026-08");
    expect(isoDate(now())).toBe("2026-08-31");
  });
  it("clears back to the real clock", () => {
    setReferenceDate("2020-01-01");
    setReferenceDate(null);
    expect(currentMonthKey()).toBe(isoDate(new Date()).slice(0, 7));
  });
  it("relativeDay is anchored to the reference clock", () => {
    setReferenceDate("2026-08-31");
    expect(relativeDay("2026-08-31")).toBe("Today");
    expect(relativeDay("2026-08-30")).toBe("Yesterday");
    expect(relativeDay("2026-08-01")).toBe("Aug 1");
  });
});
