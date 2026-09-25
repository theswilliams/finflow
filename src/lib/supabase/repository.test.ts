import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRepo } from "./repository";

/** Minimal chainable stand-in for the Supabase query builder that records what was asked. */
function fakeSupabase(tables: Record<string, Record<string, unknown>[]> = {}) {
  const calls = { deleteIn: [] as string[][], ranges: [] as [string, number, number][] };
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    let lastRange: [number, number] | null = null;
    const chain = () => builder;
    builder.select = chain;
    builder.order = chain;
    builder.eq = chain;
    builder.maybeSingle = async () => ({ data: null, error: null });
    builder.range = (a: number, b: number) => {
      lastRange = [a, b];
      calls.ranges.push([table, a, b]);
      return builder;
    };
    builder.delete = () => ({
      in: async (_col: string, ids: string[]) => {
        calls.deleteIn.push(ids);
        return { error: null };
      },
    });
    // awaiting the builder resolves like a PostgREST response, capped at 1000 rows per request
    builder.then = (resolve: (v: unknown) => unknown) => {
      const rows = tables[table] ?? [];
      const [a, b] = lastRange ?? [0, rows.length];
      const cap = Math.min(b, a + 999);
      return Promise.resolve({ data: rows.slice(a, cap + 1), error: null }).then(resolve);
    };
    return builder;
  };
  return { client: { from } as unknown as SupabaseClient, calls };
}

const txnRow = (i: number) => ({
  id: `t${String(i).padStart(5, "0")}`,
  account_id: "a1",
  transfer_account_id: null,
  posted_on: "2026-01-15",
  merchant: `M${i}`,
  description: null,
  amount: 100,
  type: "expense",
  category_slug: "other",
  category_source: "manual",
  category_confidence: null,
  notes: null,
  tags: [],
  reviewed: true,
  import_hash: `h${i}`,
  is_demo: false,
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
});

describe("repository.loadSnapshot", () => {
  it("loads ALL transactions even when there are more than the API's 1000-row cap", async () => {
    const { client, calls } = fakeSupabase({ transactions: Array.from({ length: 2300 }, (_, i) => txnRow(i)) });
    const snapshot = await createRepo(client, "user-1").loadSnapshot();
    expect(snapshot.transactions).toHaveLength(2300);
    expect(new Set(snapshot.transactions.map((t) => t.id)).size).toBe(2300);
    expect(calls.ranges.filter(([t]) => t === "transactions").length).toBe(3);
  });
});

describe("repository.deleteTransactions", () => {
  it("splits a large bulk delete into small requests so the URL never gets too long", async () => {
    const { client, calls } = fakeSupabase();
    const ids = Array.from({ length: 1234 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`);
    await createRepo(client, "user-1").deleteTransactions(ids);
    expect(calls.deleteIn.every((part) => part.length <= 100)).toBe(true);
    expect(calls.deleteIn.flat()).toEqual(ids); // nothing lost, nothing duplicated, order kept
    expect(calls.deleteIn.length).toBe(13);
  });

  it("does nothing for an empty list", async () => {
    const { client, calls } = fakeSupabase();
    await createRepo(client, "user-1").deleteTransactions([]);
    expect(calls.deleteIn).toHaveLength(0);
  });

  it("propagates an error from a chunk instead of pretending success", async () => {
    const failing = {
      from: () => ({ delete: () => ({ in: vi.fn().mockResolvedValue({ error: { message: "boom" } }) }) }),
    } as unknown as SupabaseClient;
    await expect(createRepo(failing, "u").deleteTransactions(["a"])).rejects.toThrow(/delete transactions: boom/);
  });
});
