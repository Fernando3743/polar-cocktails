-- Polar - database advisor fixes (migration 0013).
-- Apply by hand in the Supabase SQL editor AFTER 0001..0012. Every statement is
-- idempotent and safe to run exactly once on the live database.
--
-- Clears the Supabase database linter (advisor) SECURITY warnings, with two
-- exceptions that are intentional by design (documented at the bottom):
--
--   1. is_admin() (advisors 0028/0029, anon + authenticated): it is SECURITY
--      DEFINER yet only reads the request JWT claim - it touches no privileged
--      table, so SECURITY DEFINER buys it nothing. Switch it to SECURITY INVOKER,
--      which clears both advisors (they flag only SECURITY DEFINER functions).
--      CREATE OR REPLACE preserves the existing EXECUTE grants, which the
--      *_admin_all RLS policies (0009) rely on. As INVOKER the body now runs as
--      the calling role (e.g. `authenticated` when a policy evaluates it), so it
--      must not depend on any grant that role may lack: instead of auth.jwt() it
--      reads current_setting('request.jwt.claims') directly - a pg_catalog
--      built-in needing no EXECUTE grant, and the very GUC auth.jwt() itself
--      reads. The claim value, hence the return value, is unchanged regardless of
--      DEFINER/INVOKER (GUCs are session-scoped), so admins are NOT locked out.
--
--   2. restock_on_order_cancel() (advisors 0028/0029, anon + authenticated): a
--      trigger function. It is only ever fired by the orders_restock_on_cancel
--      trigger (0006/0008), never called directly, and a trigger fires
--      regardless of the firing role's EXECUTE privilege. Revoke EXECUTE from
--      PUBLIC/anon/authenticated so it leaves the PostgREST RPC surface. It keeps
--      SECURITY DEFINER so the products stock adjustment still runs regardless of
--      the caller's privileges (the 0008 design).
--
--   3. extension_in_public (citext): the promos feature was removed in 0010 and
--      promos.code was citext's only consumer, so the extension is now unused.
--      Drop it. If anything unexpectedly still depends on the citext type, fall
--      back to relocating it into the dedicated `extensions` schema instead
--      (it stays resolvable because config.toml pins
--      extra_search_path = ['public', 'extensions'] for API requests).
--
-- NOT changed here (intentional, accepted advisor exceptions):
--   - create_order(payload jsonb) stays SECURITY DEFINER and EXECUTEable by anon
--     + authenticated (advisors 0028/0029). It IS the public, unauthenticated
--     ordering RPC: checkout runs as anon, and the function must insert
--     orders/order_items and lock products while bypassing RLS. It is hardened
--     (validates inputs, recomputes every price/total server-side, enforces
--     inventory with row locks) and the app rate-limits it per IP
--     (lib/actions/orders.ts). Routing it through the service-role key to satisfy
--     the advisor would expose the service role on an unauthenticated endpoint -
--     strictly worse - so the two create_order warnings are left as documented.
--   - auth_leaked_password_protection is a Supabase Auth setting, not SQL. Enable
--     it in the dashboard: Authentication -> Sign In / Providers -> Password ->
--     turn on "Leaked password protection" (checks HaveIBeenPwned; requires a
--     paid plan). See LAUNCH_RUNBOOK.md section 3.

-- ---------------------------------------------------------------------------
-- 1. is_admin(): SECURITY DEFINER -> SECURITY INVOKER. Same role check as 0009,
--    but with auth.jwt() inlined to its exact definition (the two request.jwt
--    claim GUCs, read via the current_setting built-in) so the result is
--    identical yet depends on no grant the invoking role might lack.
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select coalesce(
    coalesce(
      nullif(current_setting('request.jwt.claim',  true), ''),
      nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb -> 'app_metadata' ->> 'role',
    ''
  ) in ('admin', 'super_admin');
$$;

-- ---------------------------------------------------------------------------
-- 2. restock_on_order_cancel(): remove the trigger-only function from the API
--    surface. The orders_restock_on_cancel trigger (0006) still fires it. REVOKE
--    is a no-op when a grant is absent, so this is idempotent.
-- ---------------------------------------------------------------------------
revoke execute on function restock_on_order_cancel() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Remove the now-unused citext extension from the public schema. Run last:
--    it is the only statement here that can fail on extension ownership, so the
--    is_admin / restock fixes above are already applied if it does.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'citext' and n.nspname = 'public'
  ) then
    begin
      -- promos (dropped in 0010) was citext's only consumer; it should be unused.
      -- Plain DROP (RESTRICT) raises if anything still depends on it.
      execute 'drop extension citext';
    exception
      when dependent_objects_still_exist then
        -- Unexpected dependent on the citext type: keep the extension but move it
        -- out of public so extension_in_public clears. Still resolvable via the
        -- API extra_search_path (config.toml).
        create schema if not exists extensions;
        execute 'alter extension citext set schema extensions';
    end;
  end if;
end;
$$;
