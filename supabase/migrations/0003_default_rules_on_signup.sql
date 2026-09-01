-- Seed the starter categorization rules server-side, inside the same path that
-- creates the user, so the client never races the auth.users commit trying to
-- insert them (which produced transient FK errors + duplicate rows).

-- 1. De-duplicate any rules that already slipped through, keeping the oldest.
delete from categorization_rules a
using categorization_rules b
where a.user_id = b.user_id
  and a.field = b.field
  and a.op = b.op
  and lower(a.value) = lower(b.value)
  and a.ctid > b.ctid;

-- 2. Prevent it happening again.
create unique index if not exists categorization_rules_uniq
  on categorization_rules (user_id, field, op, lower(value));

-- 3. Give new users their starter rules as part of sign-up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.categorization_rules (user_id, field, op, value, category_slug, priority)
  values
    (new.id, 'merchant', 'contains', 'Amazon',   'shopping',  50),
    (new.id, 'merchant', 'contains', 'Costco',   'groceries', 50),
    (new.id, 'merchant', 'contains', 'GoodLife', 'health',    60)
  on conflict do nothing;

  return new;
end;
$$;

-- 4. Backfill starter rules for existing users.
insert into categorization_rules (user_id, field, op, value, category_slug, priority)
select u.id, 'merchant'::rule_field, 'contains'::rule_op, v.value, v.slug, v.priority
from auth.users u
cross join (values
  ('Amazon', 'shopping', 50),
  ('Costco', 'groceries', 50),
  ('GoodLife', 'health', 60)
) as v(value, slug, priority)
on conflict do nothing;
