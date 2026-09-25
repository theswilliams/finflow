-- ============================================================================
--  Tenant integrity for transactions -> accounts
--
--  Problem: RLS on `transactions` only checks that the row's own user_id equals
--  auth.uid(). The foreign keys on account_id / transfer_account_id pointed at
--  accounts(id) alone, and foreign-key checks are not subject to RLS. So a user
--  could insert or update a transaction of their own that references ANOTHER
--  user's account (if they knew its UUID). That breaks tenant isolation:
--  deleting that account would cascade-delete the other user's transactions.
--
--  Fix: make the account a tenant-scoped reference with composite foreign keys
--  (account_id, user_id) -> accounts (id, user_id). The database now guarantees
--  a transaction and the accounts it references share the same owner, regardless
--  of what the application or RLS policies do. Existing RLS is unchanged.
--
--  Requires PostgreSQL 15+ (ON DELETE SET NULL with a column list), which is what
--  current Supabase projects run.
-- ============================================================================

-- 1. Refuse to migrate if bad data already exists: repairing cross-tenant links
--    automatically could destroy or misassign someone's data.
do $$
declare
  bad integer;
begin
  select count(*) into bad
  from transactions t
  join accounts a on a.id = t.account_id
  where a.user_id <> t.user_id;
  if bad > 0 then
    raise exception 'Cannot apply tenant integrity: % transaction(s) reference an account owned by a different user. Review them manually first.', bad;
  end if;

  select count(*) into bad
  from transactions t
  join accounts a on a.id = t.transfer_account_id
  where a.user_id <> t.user_id;
  if bad > 0 then
    raise exception 'Cannot apply tenant integrity: % transaction(s) transfer to an account owned by a different user. Review them manually first.', bad;
  end if;
end $$;

-- 2. A transfer's destination must differ from its source. Clear any existing
--    self-transfers (harmless: the destination is meaningless in that case).
update transactions set transfer_account_id = null where transfer_account_id = account_id;

-- 3. Composite key target for the tenant-scoped foreign keys.
alter table accounts
  add constraint accounts_id_user_id_key unique (id, user_id);

-- 4. Replace the single-column foreign keys with owner-checked ones.
alter table transactions
  drop constraint if exists transactions_account_id_fkey,
  drop constraint if exists transactions_transfer_account_id_fkey;

alter table transactions
  add constraint transactions_account_owner_fkey
    foreign key (account_id, user_id) references accounts (id, user_id) on delete cascade,
  add constraint transactions_transfer_account_owner_fkey
    foreign key (transfer_account_id, user_id) references accounts (id, user_id)
    on delete set null (transfer_account_id),
  add constraint transactions_transfer_distinct_chk
    check (transfer_account_id is null or transfer_account_id <> account_id);
