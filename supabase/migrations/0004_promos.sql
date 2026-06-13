-- Polar - promo codes / discounts (migration 0004).
-- Apply by hand in the Supabase SQL editor AFTER 0001, 0002 and 0003.
--
-- Enables citext, creates the promo_type enum + promos table + RLS, adds
-- promo_code / discount_total to orders, creates validate_promo() (anon-safe
-- preview), and re-issues create_order. The create_order here is CUMULATIVE:
-- it carries the inventory logic from 0003 (FOR UPDATE lock, product_sold_out,
-- insufficient_stock, stock decrement) AND adds promo logic (validate code,
-- clamp discount, atomic times_redeemed increment, persist promo_code /
-- discount_total). Server recomputes prices and discount; client values are
-- never trusted.
--
-- NOTE: Spanish reason strings here are intentionally ASCII (no accents) to keep
-- the migration ASCII-only. The TS demo path uses accented Spanish; both are
-- acceptable customer copy.

-- ---------------------------------------------------------------------------
-- Extensions (0001 enables only pgcrypto, so citext must be enabled here)
-- ---------------------------------------------------------------------------
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- promo_type enum
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'promo_type') then
    create type promo_type as enum ('percent', 'fixed');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- promos table
-- ---------------------------------------------------------------------------
create table if not exists promos (
  id              uuid primary key default gen_random_uuid(),
  code            citext not null unique,
  type            promo_type not null,
  value           integer not null check (value > 0),
  min_subtotal    integer check (min_subtotal is null or min_subtotal >= 0),
  active          boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  times_redeemed  integer not null default 0 check (times_redeemed >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint promos_percent_max check (type <> 'percent' or value <= 100)
);

-- Reuse the set_updated_at() function defined in 0001.
drop trigger if exists promos_set_updated_at on promos;
create trigger promos_set_updated_at
  before update on promos
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- orders: store the applied code + the computed discount (idempotent)
-- ---------------------------------------------------------------------------
alter table orders add column if not exists promo_code text;
alter table orders add column if not exists discount_total integer not null default 0
  check (discount_total >= 0);

-- ---------------------------------------------------------------------------
-- RLS: admin manages; public cannot read promos directly.
-- (no anon select/insert/update policy: anon validates only via the RPCs.)
-- ---------------------------------------------------------------------------
alter table promos enable row level security;
drop policy if exists promos_admin_all on promos;
create policy promos_admin_all
  on promos for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- validate_promo(p_code, p_subtotal) - anon-safe (security definer) preview.
-- Returns jsonb { valid, type, value, discount, reason }.
-- ---------------------------------------------------------------------------
create or replace function validate_promo(p_code text, p_subtotal integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo  promos%rowtype;
  v_raw    integer;
  v_disc   integer;
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Ingresa un codigo.');
  end if;
  select * into v_promo from promos where code = p_code::citext;
  if not found or not v_promo.active then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Codigo no valido.');
  end if;
  if v_promo.starts_at is not null and now() < v_promo.starts_at then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Este codigo aun no esta disponible.');
  end if;
  if v_promo.ends_at is not null and now() > v_promo.ends_at then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Este codigo ya expiro.');
  end if;
  if v_promo.max_redemptions is not null
     and v_promo.times_redeemed >= v_promo.max_redemptions then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Este codigo ya no esta disponible.');
  end if;
  if v_promo.min_subtotal is not null and p_subtotal < v_promo.min_subtotal then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'No alcanza el minimo para este codigo.');
  end if;
  v_raw := case when v_promo.type = 'percent'
                then floor((p_subtotal * v_promo.value) / 100.0)::int
                else v_promo.value end;
  v_disc := least(greatest(v_raw, 0), p_subtotal);  -- clamp 0..subtotal
  return jsonb_build_object('valid', true, 'type', v_promo.type::text,
    'value', v_promo.value, 'discount', v_disc, 'reason', null);
end;
$$;
grant execute on function validate_promo(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_order(payload jsonb) returns uuid - CUMULATIVE (inventory + promo).
--
-- Carries forward the 0003 inventory checks (FOR UPDATE lock, sold_out ->
-- product_sold_out, stock_qty -> insufficient_stock, decrement when tracked)
-- AND adds promo handling: recompute discount server-side, reject invalid codes
-- ('invalid_promo'), clamp the discount to 0..total, increment times_redeemed
-- atomically guarded by max_redemptions, and persist promo_code / discount_total.
-- total_cop = greatest(0, v_total - v_discount). Any raise rolls back the whole
-- transaction so no order persists when an item is unavailable or the code is bad.
-- ---------------------------------------------------------------------------
create or replace function create_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id       uuid;
  v_delivery_type  delivery_type;
  v_address        text;
  v_customer_name  text;
  v_customer_phone text;
  v_notes          text;
  v_total          integer := 0;
  v_item           jsonb;
  v_product_id     uuid;
  v_qty            integer;
  v_product        record;
  v_code           text;
  v_promo          promos%rowtype;
  v_discount       integer := 0;
  v_raw            integer;
  v_updated        integer;
begin
  v_customer_name  := btrim(coalesce(payload->>'customerName', ''));
  v_customer_phone := btrim(coalesce(payload->>'customerPhone', ''));
  v_address        := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_notes          := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_delivery_type  := (payload->>'deliveryType')::delivery_type;
  v_code           := nullif(btrim(coalesce(payload->>'promoCode', '')), '');

  if char_length(v_customer_name) < 2 then
    raise exception 'invalid_customer_name';
  end if;
  if char_length(v_customer_phone) < 7 then
    raise exception 'invalid_customer_phone';
  end if;
  if v_delivery_type = 'delivery' and v_address is null then
    raise exception 'address_required_for_delivery';
  end if;
  if jsonb_typeof(payload->'items') <> 'array'
     or jsonb_array_length(payload->'items') = 0 then
    raise exception 'empty_items';
  end if;

  insert into orders (customer_name, customer_phone, address, delivery_type,
                      notes, status, total_cop, promo_code, discount_total)
  values (v_customer_name, v_customer_phone, v_address, v_delivery_type,
          v_notes, 'pending', 0, null, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);

    if v_qty <= 0 then
      raise exception 'invalid_qty';
    end if;

    -- Lock the row to serialize concurrent stock decrements (from 0003).
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

    -- Decrement only when tracked (from 0003).
    if v_product.stock_qty is not null then
      update products set stock_qty = stock_qty - v_qty where id = v_product.id;
    end if;

    v_total := v_total + (v_product.price_cop * v_qty);
  end loop;

  -- Promo: recompute server-side; reject invalid codes; redeem atomically.
  if v_code is not null then
    select * into v_promo from promos where code = v_code::citext;
    if not found or not v_promo.active
       or (v_promo.starts_at is not null and now() < v_promo.starts_at)
       or (v_promo.ends_at  is not null and now() > v_promo.ends_at)
       or (v_promo.min_subtotal is not null and v_total < v_promo.min_subtotal) then
      raise exception 'invalid_promo';
    end if;
    v_raw := case when v_promo.type = 'percent'
                  then floor((v_total * v_promo.value) / 100.0)::int
                  else v_promo.value end;
    v_discount := least(greatest(v_raw, 0), v_total);  -- clamp 0..total

    -- Atomic redemption guard against max_redemptions.
    update promos
       set times_redeemed = times_redeemed + 1
     where id = v_promo.id
       and (max_redemptions is null or times_redeemed < max_redemptions);
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'invalid_promo';
    end if;
  end if;

  update orders
     set total_cop = greatest(0, v_total - v_discount),
         promo_code = v_code,
         discount_total = v_discount
   where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;
