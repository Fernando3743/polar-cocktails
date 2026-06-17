-- Polar - audit hardening (migration 0012).
-- Apply by hand in the Supabase SQL editor AFTER 0001..0011.
--
-- Three least-privilege / advisor fixes, every statement idempotent and safe to
-- run exactly once on the live database:
--
--   1. Drop the latent anon write surface on public.orders. Checkout never
--      touches the orders table directly - it goes through the SECURITY DEFINER
--      create_order RPC (0010), which inserts as the function owner. So the anon
--      role needs no INSERT on orders, and the orders_anon_insert policy (0002)
--      plus the broad INSERT/UPDATE/DELETE grant (0011) are pure latent
--      privilege. We drop the policy and revoke those grants. Anon keeps its
--      catalog SELECTs and the create_order EXECUTE, so the storefront is
--      unaffected.
--
--   2. Pin search_path on the two remaining plpgsql utility functions
--      (gen_order_short_code from 0005, set_updated_at from 0001) to clear the
--      "function search_path is mutable" advisor. Bodies/behavior are unchanged;
--      only `set search_path = pg_catalog, public` is added. create_order,
--      is_admin, and the inventory functions already pin search_path.
--
--   3. Lock down the public Storage buckets (product-images, site-assets from
--      0007) with a size limit and an image-only mime allowlist.

-- ---------------------------------------------------------------------------
-- 1. orders: remove the latent anon write surface.
--
-- The orders_anon_insert policy (0002_rls.sql) granted anon a direct INSERT on
-- orders. It is no longer needed: checkout calls create_order (SECURITY
-- DEFINER), which performs the insert as the function owner, bypassing the
-- caller's row policies. RLS already blocks anon UPDATE/DELETE (there is no anon
-- policy for them), but 0011_public_grants.sql handed anon the table-level
-- INSERT/UPDATE/DELETE privileges; revoke them so the grant matches the policy.
-- Anon's SELECT on products/categories/site_assets/shop_settings and EXECUTE on
-- create_order are untouched, so the storefront read + checkout paths still work.
-- ---------------------------------------------------------------------------
drop policy if exists orders_anon_insert on orders;

revoke insert, update, delete on public.orders from anon;

-- ---------------------------------------------------------------------------
-- 2. Pin search_path on the remaining mutable-search_path functions.
-- ---------------------------------------------------------------------------

-- gen_order_short_code() (0005): orders.short_code default. Body is byte-for-byte
-- the 0005 definition; only the pinned search_path is added.
create or replace function gen_order_short_code()
returns text
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'POL-' || code;
end;
$$;

-- The column default runs as the table owner and create_order (SECURITY DEFINER)
-- calls this internally as the function owner; no client ever invokes it
-- directly. Revoke the EXECUTE that 0011_public_grants.sql handed to anon.
revoke execute on function gen_order_short_code() from anon;

-- set_updated_at() (0001): the BEFORE UPDATE trigger function on every table with
-- an updated_at column. Body unchanged; only the pinned search_path is added.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Storage buckets (0007): cap object size and restrict to image mime types.
-- 5 MiB per object; PNG / JPEG / WebP / AVIF only. Public read + admin write
-- policies (0007/0009) are unchanged.
-- ---------------------------------------------------------------------------
update storage.buckets
   set file_size_limit   = 5242880, -- 5 * 1024 * 1024 bytes
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
 where id in ('product-images', 'site-assets');
