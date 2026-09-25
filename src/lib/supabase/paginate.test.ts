import { describe, expect, it, vi } from "vitest";
import { fetchAllRows } from "./paginate";

/** A fake table that behaves like PostgREST: honours .range() but never returns more than `serverMax` rows. */
function fakeTable(total: number, serverMax = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
  return vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, Math.min(to, from + serverMax - 1) + 1),
    error: null,
  }));
}

describe("fetchAllRows", () => {
  it("returns every row when the table is larger than the server's row cap (the bug: silent truncation at 1000)", async () => {
    const page = fakeTable(2500);
    const { data, error } = await fetchAllRows(page, 1000);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(new Set(data.map((r) => r.id)).size).toBe(2500); // no duplicates, no gaps
    expect(data[0].id).toBe(1);
    expect(data.at(-1)!.id).toBe(2500);
  });

  it("shows why a plain select is wrong: a single capped request loses rows", async () => {
    const page = fakeTable(2500);
    const single = await page(0, 999999); // what select('*') effectively does
    expect(single.data.length).toBe(1000);
    expect(single.data.length).toBeLessThan(2500);
  });

  it("makes exactly ceil(n / pageSize) requests, with contiguous ranges", async () => {
    const page = fakeTable(2500);
    await fetchAllRows(page, 1000);
    expect(page.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("stops after a short page, and handles an exact multiple of the page size", async () => {
    const exact = fakeTable(2000);
    const r = await fetchAllRows(exact, 1000);
    expect(r.data).toHaveLength(2000);
    expect(exact).toHaveBeenCalledTimes(3); // the third (empty) page confirms the end
  });

  it("returns an empty list for an empty table", async () => {
    const r = await fetchAllRows(fakeTable(0), 1000);
    expect(r).toEqual({ data: [], error: null });
  });

  it("surfaces an error from any page instead of returning partial data as if complete", async () => {
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "connection reset" } });
    const r = await fetchAllRows(page, 1000);
    expect(r.error?.message).toBe("connection reset");
    expect(r.data).toEqual([]);
  });

  it("does not loop forever if the server ignores .range()", async () => {
    const stuck = vi.fn(async () => ({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null }));
    const r = await fetchAllRows(stuck, 1000, 5);
    expect(stuck).toHaveBeenCalledTimes(5);
    expect(r.error?.message).toMatch(/Too many rows/);
  });
});
