import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Database-level tenant-integrity tests. They apply the REAL migration files in
 * supabase/migrations to an in-process Postgres (PGlite) with a minimal stand-in
 * for Supabase's `auth` schema, then act as different users through a
 * non-superuser role so Row Level Security is actually enforced.
 *
 * Boundary under test: RLS only checks the row's own user_id, and foreign-key
 * checks bypass RLS, so without extra constraints a user could attach their
 * transaction to ANOTHER user's account. Migration 0004 closes that at the
 * database level.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role authenticated nologin;
  grant usage on schema public to authenticated;
`;

async function createDb(upToPrefix?: string) {
  const db = new PGlite({ extensions: { pgcrypto, pg_trgm } });
  await db.exec(AUTH_STUB);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !upToPrefix || f.slice(0, 4) <= upToPrefix);
  for (const f of files) await db.exec(readFileSync(join(MIGRATIONS_DIR, f), "utf8"));
  await db.exec("grant select, insert, update, delete on all tables in schema public to authenticated;");
  return db;
}

async function actAs(db: PGlite, userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
}

async function addUser(db: PGlite, email: string): Promise<string> {
  await db.exec("reset role");
  const r = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
  return r.rows[0].id;
}

async function addAccount(db: PGlite, userId: string, name: string): Promise<string> {
  await actAs(db, userId);
  const r = await db.query<{ id: string }>(
    "insert into accounts (user_id, name, type) values ($1, $2, 'chequing') returning id",
    [userId, name],
  );
  return r.rows[0].id;
}

function insertTxn(
  db: PGlite,
  userId: string,
  accountId: string,
  opts: { type?: string; transferTo?: string | null; merchant?: string } = {},
) {
  return db.query(
    `insert into transactions (user_id, account_id, transfer_account_id, posted_on, merchant, amount, type)
     values ($1, $2, $3, '2026-01-15', $4, 1000, $5::transaction_type) returning id`,
    [userId, accountId, opts.transferTo ?? null, opts.merchant ?? "Test", opts.type ?? "expense"],
  );
}

describe("pre-fix schema (migrations 0001-0003 only): documents the vulnerability", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createDb("0003");
  });
  afterAll(async () => db.close());

  it("RLS alone lets user A attach a transaction to user B's account", async () => {
    const a = await addUser(db, "a@example.com");
    const b = await addUser(db, "b@example.com");
    await addAccount(db, a, "A chequing");
    const bAcct = await addAccount(db, b, "B chequing");
    await actAs(db, a);
    // Succeeds: this is the bug the 0004 migration fixes.
    await expect(insertTxn(db, a, bAcct)).resolves.toBeTruthy();
  });
});

describe("tenant integrity with all migrations applied", () => {
  let db: PGlite;
  let userA: string;
  let userB: string;
  let a1: string;
  let a2: string;
  let b1: string;

  beforeAll(async () => {
    db = await createDb();
    userA = await addUser(db, "a@example.com");
    userB = await addUser(db, "b@example.com");
    a1 = await addAccount(db, userA, "A chequing");
    a2 = await addAccount(db, userA, "A savings");
    b1 = await addAccount(db, userB, "B chequing");
  });
  afterAll(async () => db.close());

  it("allows a normal transaction on the user's own account", async () => {
    await actAs(db, userA);
    const r = await insertTxn(db, userA, a1);
    expect(r.rows).toHaveLength(1);
  });

  it("rejects a transaction pointing at another user's account", async () => {
    await actAs(db, userA);
    await expect(insertTxn(db, userA, b1)).rejects.toThrow(/foreign key|violates/i);
  });

  it("rejects claiming another user's user_id (RLS still applies)", async () => {
    await actAs(db, userA);
    await expect(insertTxn(db, userB, a1)).rejects.toThrow(/row-level security|violates/i);
  });

  it("rejects a transfer whose destination is another user's account", async () => {
    await actAs(db, userA);
    await expect(insertTxn(db, userA, a1, { type: "transfer", transferTo: b1 })).rejects.toThrow(
      /foreign key|violates/i,
    );
  });

  it("allows a transfer between two of the user's own accounts", async () => {
    await actAs(db, userA);
    const r = await insertTxn(db, userA, a1, { type: "transfer", transferTo: a2 });
    expect(r.rows).toHaveLength(1);
  });

  it("rejects a transfer to the same account", async () => {
    await actAs(db, userA);
    await expect(insertTxn(db, userA, a1, { type: "transfer", transferTo: a1 })).rejects.toThrow(
      /check constraint|violates/i,
    );
  });

  it("rejects UPDATEs that re-point account_id or transfer_account_id at another user's account", async () => {
    await actAs(db, userA);
    const t = await insertTxn(db, userA, a1, { merchant: "Movable" });
    const id = (t.rows[0] as { id: string }).id;
    await expect(db.query("update transactions set account_id = $1 where id = $2", [b1, id])).rejects.toThrow(
      /foreign key|violates/i,
    );
    await expect(
      db.query("update transactions set transfer_account_id = $1 where id = $2", [b1, id]),
    ).rejects.toThrow(/foreign key|violates/i);
  });

  it("allows updates that stay within the user's own accounts", async () => {
    await actAs(db, userA);
    const t = await insertTxn(db, userA, a1, { merchant: "Movable 2" });
    const id = (t.rows[0] as { id: string }).id;
    await expect(db.query("update transactions set account_id = $1 where id = $2", [a2, id])).resolves.toBeTruthy();
  });

  it("deleting a destination account keeps the transfer and only clears transfer_account_id", async () => {
    await actAs(db, userA);
    const extra = await addAccount(db, userA, "Temp");
    const t = await insertTxn(db, userA, a1, { type: "transfer", transferTo: extra, merchant: "To temp" });
    const id = (t.rows[0] as { id: string }).id;
    await db.query("delete from accounts where id = $1", [extra]);
    const after = await db.query<{ user_id: string; transfer_account_id: string | null }>(
      "select user_id, transfer_account_id from transactions where id = $1",
      [id],
    );
    expect(after.rows).toHaveLength(1);
    expect(after.rows[0].transfer_account_id).toBeNull();
    expect(after.rows[0].user_id).toBe(userA);
  });

  it("one user's transactions are invisible to another user (RLS unchanged)", async () => {
    await actAs(db, userB);
    const r = await db.query("select count(*)::int as n from transactions");
    expect((r.rows[0] as { n: number }).n).toBe(0);
  });

  it("a user cannot move an account to another user", async () => {
    await actAs(db, userA);
    await expect(db.query("update accounts set user_id = $1 where id = $2", [userB, a1])).rejects.toThrow();
  });
});

describe("migration 0004 safety guard", () => {
  it("refuses to apply when cross-user references already exist, instead of silently rewriting data", async () => {
    const db = await createDb("0003");
    try {
      const a = await addUser(db, "a@example.com");
      const b = await addUser(db, "b@example.com");
      await addAccount(db, a, "A");
      const bAcct = await addAccount(db, b, "B");
      await actAs(db, a);
      await insertTxn(db, a, bAcct); // the pre-fix hole
      await db.exec("reset role");
      const sql = readFileSync(join(MIGRATIONS_DIR, "0004_tenant_integrity.sql"), "utf8");
      await expect(db.exec(sql)).rejects.toThrow(/different user/i);
    } finally {
      await db.close();
    }
  });

  it("applies cleanly over existing valid data and clears self-transfers", async () => {
    const db = await createDb("0003");
    try {
      const a = await addUser(db, "a@example.com");
      const a1 = await addAccount(db, a, "A1");
      await actAs(db, a);
      const t = await insertTxn(db, a, a1, { type: "transfer", transferTo: a1 });
      const id = (t.rows[0] as { id: string }).id;
      await db.exec("reset role");
      await db.exec(readFileSync(join(MIGRATIONS_DIR, "0004_tenant_integrity.sql"), "utf8"));
      const r = await db.query<{ transfer_account_id: string | null }>(
        "select transfer_account_id from transactions where id = $1",
        [id],
      );
      expect(r.rows[0].transfer_account_id).toBeNull();
    } finally {
      await db.close();
    }
  });
});
