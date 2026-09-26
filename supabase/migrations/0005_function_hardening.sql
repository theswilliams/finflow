-- ============================================================================
--  Function hardening (from Supabase's security advisor)
--
--  1. handle_new_user() is a SECURITY DEFINER trigger function. PostgreSQL grants
--     EXECUTE on new functions to PUBLIC by default, so Supabase's REST API
--     exposed it at /rest/v1/rpc/handle_new_user to signed-out and signed-in
--     users. It is only meant to run as the auth.users trigger, and trigger
--     execution does not need the caller to hold EXECUTE, so revoking it does not
--     affect sign-up.
--
--  2. set_updated_at() had a role-mutable search_path. It only uses now(), which
--     lives in pg_catalog (always searched), so an empty search_path is safe.
--
--  Not changed: pg_trgm stays in the public schema. Moving it is cosmetic and
--  risks breaking the trigram index and any query that calls its functions.
-- ============================================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = '';
