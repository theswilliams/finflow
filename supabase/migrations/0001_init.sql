-- ============================================================================
--  FinFlow — initial schema
--
--  * All monetary values are integer cents (bigint). Never floats.
--  * UUID primary keys, created_at / updated_at on every mutable table.
--  * Row Level Security is enabled everywhere: a user can only read or write
--    rows they own (user_id = auth.uid()).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
--  Enums
-- ---------------------------------------------------------------------------
create type account_type      as enum ('chequing', 'savings', 'credit_card', 'cash', 'investment', 'loan');
create type transaction_type  as enum ('expense', 'income', 'transfer');
create type category_kind     as enum ('expense', 'income', 'transfer');
create type category_source   as enum ('manual', 'rule', 'auto', 'uncategorized');
create type rule_field        as enum ('merchant', 'description');
create type rule_op           as enum ('contains', 'equals', 'starts_with');

-- ---------------------------------------------------------------------------
--  updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
--  profiles  (1:1 with auth.users, auto-created on sign-up)
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  base_currency text not null default 'CAD',
  demo_seeded   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
--  categories
--  The 14 product categories are addressed by a stable `slug` in the app.
--  System rows (user_id null, is_system true) are readable by everyone;
--  users may add their own rows with a unique slug.
-- ---------------------------------------------------------------------------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  slug        text not null,
  name        text not null,
  kind        category_kind not null default 'expense',
  color_token text not null default '--cat-other',
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index categories_system_slug_idx on categories (slug) where is_system;
create unique index categories_user_slug_idx   on categories (user_id, slug) where user_id is not null;

-- ---------------------------------------------------------------------------
--  accounts
-- ---------------------------------------------------------------------------
create table accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  type             account_type not null,
  institution      text,
  opening_balance  bigint not null default 0,   -- cents
  currency         text not null default 'CAD',
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index accounts_user_idx on accounts (user_id);

create trigger accounts_updated_at before update on accounts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
--  categorization_rules
-- ---------------------------------------------------------------------------
create table categorization_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  field         rule_field not null default 'merchant',
  op            rule_op not null default 'contains',
  value         text not null,
  category_slug text not null,
  priority      int not null default 100,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now()
);

create index rules_user_idx on categorization_rules (user_id, priority desc);

-- ---------------------------------------------------------------------------
--  transactions
--  Tags are stored as a text[] on the row — they are free-form labels, not
--  shared entities, so a join table would only add write amplification.
-- ---------------------------------------------------------------------------
create table transactions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  account_id           uuid not null references accounts (id) on delete cascade,
  transfer_account_id  uuid references accounts (id) on delete set null,
  posted_on            date not null,
  merchant             text not null,
  description          text,
  amount               bigint not null check (amount > 0),   -- cents, always positive
  type                 transaction_type not null,
  category_slug        text not null default 'other',
  category_source      category_source not null default 'uncategorized',
  category_confidence  real,
  notes                text,
  tags                 text[] not null default '{}',
  reviewed             boolean not null default false,
  import_hash          text,
  is_demo              boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index transactions_user_date_idx    on transactions (user_id, posted_on desc);
create index transactions_account_idx      on transactions (account_id);
create index transactions_category_idx     on transactions (user_id, category_slug);
create index transactions_merchant_trgm    on transactions using gin (merchant gin_trgm_ops);
create index transactions_review_idx       on transactions (user_id) where reviewed = false;
create unique index transactions_dedupe_idx on transactions (user_id, import_hash) where import_hash is not null;

create trigger transactions_updated_at before update on transactions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
--  budgets  (one monthly limit per category)
-- ---------------------------------------------------------------------------
create table budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  category_slug text not null,
  limit_cents   bigint not null check (limit_cents >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, category_slug)
);

create trigger budgets_updated_at before update on budgets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
--  goals
-- ---------------------------------------------------------------------------
create table goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  target_amount  bigint not null check (target_amount > 0),
  current_amount bigint not null default 0 check (current_amount >= 0),
  target_date    date,
  accent_token   text default '--positive',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index goals_user_idx on goals (user_id);

create trigger goals_updated_at before update on goals
  for each row execute function set_updated_at();

-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table profiles             enable row level security;
alter table categories           enable row level security;
alter table accounts             enable row level security;
alter table categorization_rules enable row level security;
alter table transactions         enable row level security;
alter table budgets              enable row level security;
alter table goals                enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "read categories" on categories
  for select using (is_system or user_id = auth.uid());
create policy "insert own categories" on categories
  for insert with check (user_id = auth.uid() and not is_system);
create policy "update own categories" on categories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own categories" on categories
  for delete using (user_id = auth.uid());

create policy "own rows" on accounts             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on categorization_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on transactions         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on budgets              for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on goals                for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
--  Seed the 14 system categories
-- ============================================================================
insert into categories (slug, name, kind, color_token, is_system) values
  ('housing',        'Housing',        'expense',  '--cat-housing',        true),
  ('transportation', 'Transportation', 'expense',  '--cat-transportation', true),
  ('groceries',      'Groceries',      'expense',  '--cat-groceries',      true),
  ('restaurants',    'Restaurants',    'expense',  '--cat-restaurants',    true),
  ('shopping',       'Shopping',       'expense',  '--cat-shopping',       true),
  ('entertainment',  'Entertainment',  'expense',  '--cat-entertainment',  true),
  ('utilities',      'Utilities',      'expense',  '--cat-utilities',      true),
  ('subscriptions',  'Subscriptions',  'expense',  '--cat-subscriptions',  true),
  ('health',         'Health',         'expense',  '--cat-health',         true),
  ('travel',         'Travel',         'expense',  '--cat-travel',         true),
  ('personal',       'Personal',       'expense',  '--cat-personal',       true),
  ('income',         'Income',         'income',   '--cat-income',         true),
  ('transfer',       'Transfer',       'transfer', '--cat-transfer',       true),
  ('other',          'Other',          'expense',  '--cat-other',          true)
on conflict do nothing;
