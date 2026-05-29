-- Polar — initial schema
-- Enums, tables (categories, products, orders, order_items), constraints,
-- indexes, an updated_at trigger, a generated line_total_cop column, and seed data.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'pending',
      'confirmed',
      'preparing',
      'delivered',
      'cancelled'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'delivery_type') then
    create type delivery_type as enum ('delivery', 'pickup');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) >= 1),
  slug        text not null unique check (char_length(slug) >= 1),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_sort_order_idx
  on categories (sort_order);

drop trigger if exists categories_set_updated_at on categories;
create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories (id) on delete restrict,
  name         text not null check (char_length(name) >= 1),
  slug         text not null unique check (char_length(slug) >= 1),
  description  text not null default '',
  price_cop    integer not null check (price_cop >= 0),
  accent_color text not null default '#7C3AED'
                 check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  image_url    text,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_category_id_idx
  on products (category_id);
create index if not exists products_sort_order_idx
  on products (sort_order);
create index if not exists products_is_active_idx
  on products (is_active);

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null check (char_length(customer_name) >= 2),
  customer_phone text not null check (char_length(customer_phone) >= 7),
  address        text,
  delivery_type  delivery_type not null,
  notes          text,
  status         order_status not null default 'pending',
  total_cop      integer not null default 0 check (total_cop >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Address is required when the order is a delivery.
  constraint orders_address_required_for_delivery check (
    delivery_type <> 'delivery'
    or (address is not null and char_length(btrim(address)) > 0)
  )
);

create index if not exists orders_status_idx
  on orders (status);
create index if not exists orders_created_at_idx
  on orders (created_at desc);

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items
-- line_total_cop is GENERATED = qty * unit_price_cop
-- ---------------------------------------------------------------------------
create table if not exists order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  product_id     uuid not null references products (id) on delete restrict,
  product_name   text not null,
  qty            integer not null check (qty > 0),
  unit_price_cop integer not null check (unit_price_cop >= 0),
  line_total_cop integer generated always as (qty * unit_price_cop) stored
);

create index if not exists order_items_order_id_idx
  on order_items (order_id);
create index if not exists order_items_product_id_idx
  on order_items (product_id);

-- ---------------------------------------------------------------------------
-- Seed: categories (Frutales, Tropicales, Clásicos, Especiales)
-- ---------------------------------------------------------------------------
insert into categories (name, slug, sort_order, is_active) values
  ('Frutales',   'frutales',   1, true),
  ('Tropicales', 'tropicales', 2, true),
  ('Clásicos',   'clasicos',   3, true),
  ('Especiales', 'especiales', 4, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: products (all price_cop = 18000), matching SEED_PRODUCTS
-- ---------------------------------------------------------------------------
insert into products (category_id, name, slug, description, price_cop, accent_color, image_url, is_active, sort_order)
select c.id, p.name, p.slug, p.description, p.price_cop, p.accent_color, null, true, p.sort_order
from (
  values
    ('Polar Blue',   'polar-blue',   'Vodka, curaçao blue, limón y azúcar.',               18000, '#2EA6E0', 'clasicos',   1),
    ('Mora Polar',   'mora-polar',   'Vodka, mora, limón y un toque de soda.',             18000, '#7B2FB0', 'frutales',   2),
    ('Tropical Mix', 'tropical-mix', 'Ron, maracuyá, piña y coco.',                        18000, '#E0A52E', 'tropicales', 3),
    ('Fresa Colada', 'fresa-colada', 'Ron, fresa, coco y piña.',                           18000, '#E0457A', 'tropicales', 4),
    ('Mango Loco',   'mango-loco',   'Vodka, mango, chile y limón.',                       18000, '#E0612E', 'frutales',   5),
    ('Polar Oreo',   'polar-oreo',   'Vodka, crema de menta, oreo y leche condensada.',    18000, '#3FB58A', 'especiales', 6)
) as p (name, slug, description, price_cop, accent_color, category_slug, sort_order)
join categories c on c.slug = p.category_slug
on conflict (slug) do nothing;
