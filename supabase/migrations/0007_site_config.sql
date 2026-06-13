-- Polar - site configuration (migration 0007).
-- Apply by hand in the Supabase SQL editor AFTER 0001..0006.
--
-- Adds owner-editable site configuration that previously lived only in
-- lib/config.ts and as hard-coded imagery:
--   * site_assets   - one row per image slot (hero, logo, OG card, Instagram
--                     tiles). The stored url is a public Storage URL string;
--                     href is an optional outbound link (used by Instagram tiles).
--   * shop_settings - a single-row table (id is always true) holding the
--                     WhatsApp number, address lines, Maps URL, social links,
--                     and opening hours.
-- RLS mirrors the *_admin_all model in 0002_rls.sql: public (anon +
-- authenticated) READ, admin (authenticated) WRITE. Two public Storage buckets
-- ('product-images', 'site-assets') are created with object policies that allow
-- public reads and authenticated writes. The single shop_settings row is seeded
-- from the current lib/config.ts constants.

-- ---------------------------------------------------------------------------
-- site_assets
-- One row per image slot. slot is the primary key (e.g. 'hero_desktop',
-- 'hero_mobile', 'logo', 'og_image', 'instagram_1'..'instagram_5'). url is the
-- public Storage URL; href is an optional outbound link for clickable tiles.
-- ---------------------------------------------------------------------------
create table if not exists site_assets (
  slot       text primary key,
  url        text not null,
  href       text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_assets_set_updated_at on site_assets;
create trigger site_assets_set_updated_at
  before update on site_assets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- shop_settings
-- Single-row configuration table. The id column is a boolean fixed to true
-- (check (id)) so at most one row can ever exist; upserts target id = true.
-- ---------------------------------------------------------------------------
create table if not exists shop_settings (
  id              boolean primary key default true check (id),
  whatsapp_number text not null,
  address_lines   text[] not null default '{}',
  maps_url        text,
  social_links    jsonb not null default '{}'::jsonb,
  opening_hours   jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

drop trigger if exists shop_settings_set_updated_at on shop_settings;
create trigger shop_settings_set_updated_at
  before update on shop_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: public read + admin write (mirrors the *_admin_all model in 0002_rls.sql)
-- ---------------------------------------------------------------------------
alter table site_assets   enable row level security;
alter table shop_settings enable row level security;

drop policy if exists site_assets_public_read on site_assets;
create policy site_assets_public_read
  on site_assets
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_assets_admin_all on site_assets;
create policy site_assets_admin_all
  on site_assets
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists shop_settings_public_read on shop_settings;
create policy shop_settings_public_read
  on shop_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists shop_settings_admin_all on shop_settings;
create policy shop_settings_admin_all
  on shop_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Public Storage buckets: 'product-images' and 'site-assets'.
-- Both are public so getPublicUrl(...) serves images without signed URLs.
-- on conflict do nothing keeps re-running this migration idempotent.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('site-assets',    'site-assets',    true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage object policies: public SELECT + authenticated INSERT/UPDATE for the
-- two buckets above. The admin (authenticated) uploads from the browser client;
-- anonymous visitors only read.
-- ---------------------------------------------------------------------------
drop policy if exists polar_storage_public_read on storage.objects;
create policy polar_storage_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id in ('product-images', 'site-assets'));

drop policy if exists polar_storage_authenticated_insert on storage.objects;
create policy polar_storage_authenticated_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id in ('product-images', 'site-assets'));

drop policy if exists polar_storage_authenticated_update on storage.objects;
create policy polar_storage_authenticated_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id in ('product-images', 'site-assets'))
  with check (bucket_id in ('product-images', 'site-assets'));

-- ---------------------------------------------------------------------------
-- Seed the single shop_settings row from the current lib/config.ts constants:
--   WHATSAPP_NUMBER = "573000000000"
--   ADDRESS_LINES   = ['Tuluá', 'Calle 41a # 26-81', 'Paso ancho príncipe']
--   MAPS_URL        = "https://maps.google.com/?q=Calle+41a+%2326-81+Tulua"
--   SOCIAL_LINKS    = [Instagram '#', Facebook '#', TikTok '#']
--   OPENING_HOURS   = [] (empty in config -> [] here)
-- on conflict (id) do nothing so re-running never clobbers owner edits.
-- ---------------------------------------------------------------------------
insert into shop_settings (id, whatsapp_number, address_lines, maps_url, social_links, opening_hours)
values (
  true,
  '573000000000',
  array['Tuluá', 'Calle 41a # 26-81', 'Paso ancho príncipe'],
  'https://maps.google.com/?q=Calle+41a+%2326-81+Tulua',
  jsonb_build_object(
    'instagram', '#',
    'facebook',  '#',
    'tiktok',    '#'
  ),
  '[]'::jsonb
)
on conflict (id) do nothing;
