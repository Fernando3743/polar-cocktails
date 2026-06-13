-- Polar - admin-role RLS hardening (migration 0009).
-- Apply by hand in the Supabase SQL editor AFTER 0001..0008.
--
-- BEFORE APPLYING (lockout warning): every admin must already carry an
-- app_metadata role claim, or they will lose DB access. Run
--   node --env-file=.env.local scripts/set-admin-role.mjs <super-email> super_admin
--   node --env-file=.env.local scripts/set-admin-role.mjs <admin-email>  admin   (for each existing admin)
-- and verify everyone can still use /admin, THEN run this migration.
--
-- What this does: until now every business table trusted ANY authenticated
-- session (the *_admin_all policies were `using(true) with check(true)`), so the
-- only real admin gate lived in the app layer. This migration moves that gate
-- into Postgres via is_admin(), which reads the trusted app_metadata.role claim
-- from the JWT. Public reads, anonymous order inserts, and the SECURITY DEFINER
-- RPCs (create_order / validate_promo) are deliberately left untouched, so
-- customer flows keep working. Pair with disabling public sign-ups in the
-- Supabase dashboard (and supabase/config.toml enable_signup = false).

-- ---------------------------------------------------------------------------
-- is_admin(): true when the caller's JWT carries an admin role claim. STABLE +
-- SECURITY DEFINER; app_metadata is writable only by the service role, so the
-- claim is trustworthy. (Regular admins carry 'admin'; the super admin 'super_admin'.)
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin');
$$;

grant execute on function is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Replace the bare `using(true)` admin-write policies with is_admin() gates.
-- Public-read policies (categories/products active rows, site/shop settings,
-- storage public read) and the anon order-insert policies are NOT touched.
-- ---------------------------------------------------------------------------

-- categories / products (0002)
drop policy if exists categories_admin_all on categories;
create policy categories_admin_all
  on categories for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists products_admin_all on products;
create policy products_admin_all
  on products for all to authenticated
  using (is_admin()) with check (is_admin());

-- orders / order_items (0002) - anon insert policies remain intact
drop policy if exists orders_admin_all on orders;
create policy orders_admin_all
  on orders for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists order_items_admin_all on order_items;
create policy order_items_admin_all
  on order_items for all to authenticated
  using (is_admin()) with check (is_admin());

-- promos (0004) - anon previews go through the SECURITY DEFINER validate_promo
drop policy if exists promos_admin_all on promos;
create policy promos_admin_all
  on promos for all to authenticated
  using (is_admin()) with check (is_admin());

-- site_assets / shop_settings (0007) - public read policies remain intact
drop policy if exists site_assets_admin_all on site_assets;
create policy site_assets_admin_all
  on site_assets for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists shop_settings_admin_all on shop_settings;
create policy shop_settings_admin_all
  on shop_settings for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Storage writes (0007): only admins may upload/replace bucket objects. Public
-- read (polar_storage_public_read) is left as-is so images stay viewable.
-- ---------------------------------------------------------------------------
drop policy if exists polar_storage_authenticated_insert on storage.objects;
create policy polar_storage_authenticated_insert
  on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'site-assets') and is_admin());

drop policy if exists polar_storage_authenticated_update on storage.objects;
create policy polar_storage_authenticated_update
  on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'site-assets') and is_admin())
  with check (bucket_id in ('product-images', 'site-assets') and is_admin());
