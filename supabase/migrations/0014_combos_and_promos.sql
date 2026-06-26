-- Polar - combos + promotional banners (migration 0014).
-- Apply after 0001..0013 (idempotent). Apply via the CLI runbook in CLAUDE.md:
--   supabase migration up --local        (local stack)
--   supabase db push --linked            (prod; only untracked versions run)
--
-- Adds two owner-editable, storefront-facing features:
--   * combos        - curated bundles (drinks + bottles) sold at a fixed price.
--                     They behave like products at checkout (priced server-side,
--                     added to the cart, persisted in an order) but live in their
--                     own table and render in their own "Combos" section.
--   * promo_banners - wide promotional banners ("Nuevo" section). Each banner's
--                     COMPRAR button adds its linked product to the cart.
--
-- To let combo lines persist in an order, order_items becomes polymorphic:
-- product_id OR combo_id (exactly one), and create_order is re-issued with a
-- combo branch. The trust boundary is unchanged: prices are always recomputed
-- server-side from the catalog row; client values are never trusted.
--
-- RLS mirrors the *_admin_all model in 0002_rls.sql / 0007_site_config.sql:
-- public (anon + authenticated) READ of active rows, admin (authenticated) WRITE.
-- Combo images reuse the existing 'product-images' bucket and banner images the
-- 'site-assets' bucket (both created in 0007), so no new bucket is needed.

-- ---------------------------------------------------------------------------
-- combos
-- ---------------------------------------------------------------------------
create table if not exists combos (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  price_cop   integer not null check (price_cop >= 0),
  accent_color text not null default '#9128da'
                check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  image_url   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  sold_out    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists combos_sort_order_idx on combos (sort_order);

drop trigger if exists combos_set_updated_at on combos;
create trigger combos_set_updated_at
  before update on combos
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- promo_banners
-- product_id is the product COMPRAR adds; on delete set null so removing a
-- product never deletes the banner (the storefront then falls back to `href`).
-- ---------------------------------------------------------------------------
create table if not exists promo_banners (
  id          uuid primary key default gen_random_uuid(),
  heading     text not null,
  image_url   text,
  product_id  uuid references products (id) on delete set null,
  href        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists promo_banners_sort_order_idx on promo_banners (sort_order);

drop trigger if exists promo_banners_set_updated_at on promo_banners;
create trigger promo_banners_set_updated_at
  before update on promo_banners
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: public read of active rows + admin write
-- ---------------------------------------------------------------------------
alter table combos        enable row level security;
alter table promo_banners enable row level security;

drop policy if exists combos_public_read on combos;
create policy combos_public_read
  on combos
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists combos_admin_all on combos;
create policy combos_admin_all
  on combos
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists promo_banners_public_read on promo_banners;
create policy promo_banners_public_read
  on promo_banners
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists promo_banners_admin_all on promo_banners;
create policy promo_banners_admin_all
  on promo_banners
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Standard table privileges (RLS still decides row access). 0011 set default
-- privileges so future tables inherit these, but grant explicitly too so the
-- migration is safe applied either by hand or via db push.
grant select, insert, update, delete on combos        to anon, authenticated;
grant select, insert, update, delete on promo_banners to anon, authenticated;

-- ---------------------------------------------------------------------------
-- order_items -> polymorphic (product OR combo)
-- ---------------------------------------------------------------------------
alter table order_items alter column product_id drop not null;

alter table order_items
  add column if not exists combo_id uuid references combos (id) on delete restrict;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_items_one_ref'
  ) then
    alter table order_items
      add constraint order_items_one_ref
      check (
        (product_id is not null and combo_id is null)
        or (product_id is null and combo_id is not null)
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_order(payload jsonb) returns jsonb - re-issued from the 0010 (post-
-- promo-removal) definition, adding a combo branch. Every product branch is
-- preserved verbatim (FOR UPDATE lock, product_sold_out, insufficient_stock,
-- stock decrement, snapshot insert, jsonb summary). For each item exactly one
-- of productId / comboId is honored; combos are priced from the combos table.
-- ---------------------------------------------------------------------------
drop function if exists create_order(jsonb);

create function create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short_code     text;
  v_order_id       uuid;
  v_delivery_type  delivery_type;
  v_address        text;
  v_customer_name  text;
  v_customer_phone text;
  v_notes          text;
  v_total          integer := 0;
  v_item           jsonb;
  v_product_id     uuid;
  v_combo_id       uuid;
  v_qty            integer;
  v_product        record;
  v_combo          record;
  v_line_total     integer;
  v_items          jsonb := '[]'::jsonb;
begin
  v_customer_name  := btrim(coalesce(payload->>'customerName', ''));
  v_customer_phone := btrim(coalesce(payload->>'customerPhone', ''));
  v_address        := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_notes          := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_delivery_type  := (payload->>'deliveryType')::delivery_type;

  if char_length(v_customer_name) < 2 then
    raise exception 'invalid_customer_name';
  end if;
  if v_customer_phone !~ '^(\+?57)?3[0-9]{9}$' then
    raise exception 'invalid_customer_phone';
  end if;
  if v_delivery_type = 'delivery' and v_address is null then
    raise exception 'address_required_for_delivery';
  end if;
  if jsonb_typeof(payload->'items') <> 'array'
     or jsonb_array_length(payload->'items') = 0 then
    raise exception 'empty_items';
  end if;

  loop
    v_short_code := gen_order_short_code();
    begin
      insert into orders (customer_name, customer_phone, address, delivery_type,
                          notes, status, total_cop, short_code)
      values (v_customer_name, v_customer_phone, v_address, v_delivery_type,
              v_notes, 'pending', 0, v_short_code)
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      -- Extremely rare; try another code.
    end;
  end loop;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := nullif(v_item->>'productId', '')::uuid;
    v_combo_id   := nullif(v_item->>'comboId', '')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);

    if v_qty <= 0 then
      raise exception 'invalid_qty';
    end if;

    if v_combo_id is not null then
      -- Combo line: price from the combos table, locked for the transaction.
      select id, name, price_cop, sold_out
        into v_combo
        from combos
       where id = v_combo_id
         and is_active = true
       for update;

      if not found then
        raise exception 'combo_not_found';
      end if;
      if v_combo.sold_out then
        raise exception 'combo_sold_out';
      end if;

      insert into order_items (order_id, combo_id, product_name, qty, unit_price_cop)
      values (v_order_id, v_combo.id, v_combo.name, v_qty, v_combo.price_cop);

      v_line_total := v_combo.price_cop * v_qty;
      v_items := v_items || jsonb_build_object(
        'product_id',     v_combo.id::text,
        'product_name',   v_combo.name,
        'qty',            v_qty,
        'unit_price_cop', v_combo.price_cop,
        'line_total_cop', v_line_total
      );

      v_total := v_total + v_line_total;
    else
      -- Product line: unchanged from 0010.
      select id, name, price_cop, sold_out, stock_qty
        into v_product
        from products
       where id = v_product_id
         and is_active = true
       for update;

      if not found then
        raise exception 'product_not_found';
      end if;
      if v_product.sold_out then
        raise exception 'product_sold_out';
      end if;
      if v_product.stock_qty is not null and v_product.stock_qty < v_qty then
        raise exception 'insufficient_stock';
      end if;

      insert into order_items (order_id, product_id, product_name, qty, unit_price_cop)
      values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price_cop);

      if v_product.stock_qty is not null then
        update products set stock_qty = stock_qty - v_qty where id = v_product.id;
      end if;

      v_line_total := v_product.price_cop * v_qty;
      v_items := v_items || jsonb_build_object(
        'product_id',     v_product.id::text,
        'product_name',   v_product.name,
        'qty',            v_qty,
        'unit_price_cop', v_product.price_cop,
        'line_total_cop', v_line_total
      );

      v_total := v_total + v_line_total;
    end if;
  end loop;

  update orders
     set total_cop = v_total
   where id = v_order_id;

  return jsonb_build_object(
    'short_code',   v_short_code,
    'items',        v_items,
    'subtotal_cop', v_total,
    'total_cop',    v_total
  );
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;
