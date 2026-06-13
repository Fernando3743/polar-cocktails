-- Polar - human-friendly order short code (migration 0005).
-- Apply by hand in the Supabase SQL editor AFTER 0001, 0002, 0003 and 0004.
--
-- The shop reads order references aloud over WhatsApp, so a UUID is awkward.
-- This adds orders.short_code (POL- + 6 base32 chars), backfills existing rows,
-- enforces a default + uniqueness, and re-issues create_order to RETURN the
-- short_code (return type becomes text) with a collision-safe retry loop.
--
-- This create_order is the FINAL, FULLY-CUMULATIVE definition: it carries the
-- inventory checks from 0003 (FOR UPDATE lock, product_sold_out,
-- insufficient_stock, stock decrement), the promo logic from 0004 (validate
-- code, clamp discount, atomic times_redeemed increment, persist promo_code /
-- discount_total), AND the short_code assignment + unique-retry insert loop.
-- It also tightens the customer phone guard to a Colombian-mobile regex.
-- Order math is unchanged (line_total_cop stays a generated column; the server
-- still recomputes prices/discount; client values are never trusted).

-- ---------------------------------------------------------------------------
-- Short code generator: Crockford-ish base32, ambiguous chars dropped.
-- ---------------------------------------------------------------------------
create or replace function gen_order_short_code()
returns text
language plpgsql
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

-- ---------------------------------------------------------------------------
-- orders.short_code: add, backfill, default, unique index (idempotent).
-- ---------------------------------------------------------------------------
alter table orders
  add column if not exists short_code text;

update orders set short_code = gen_order_short_code() where short_code is null;
alter table orders alter column short_code set default gen_order_short_code();
create unique index if not exists orders_short_code_key on orders (short_code);

-- RLS: no new policy needed. short_code is just another column on `orders`;
-- existing orders_anon_insert / orders_admin_all (0002_rls.sql) already cover it,
-- and there is still no public SELECT on orders. create_order is SECURITY DEFINER,
-- so it can assign and RETURN the generated code regardless of the caller.

-- ---------------------------------------------------------------------------
-- create_order(payload jsonb) returns text - FINAL, FULLY-CUMULATIVE.
--
-- Inventory (0003) + promo (0004) + short_code retry loop. Returns the short
-- code (text). Phone guard tightened to a Colombian mobile regex. Any raise
-- rolls back the whole transaction.
--
-- The return type changes from uuid (0002/0003/0004) to text. PostgreSQL's
-- CREATE OR REPLACE FUNCTION cannot change a function's return type, so the
-- prior definition must be dropped first. Nothing in the schema depends on
-- create_order (the app calls it via rpc), so a plain DROP is safe.
-- ---------------------------------------------------------------------------
drop function if exists create_order(jsonb);

create function create_order(payload jsonb)
returns text                       -- was uuid; now returns the short code
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
  v_qty            integer;
  v_product        record;
  v_code           text;
  v_promo          promos%rowtype;
  v_discount       integer := 0;
  v_raw            integer;
  v_updated        integer;
begin
  -- ---- validation ----
  v_customer_name  := btrim(coalesce(payload->>'customerName', ''));
  v_customer_phone := btrim(coalesce(payload->>'customerPhone', ''));
  v_address        := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_notes          := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_delivery_type  := (payload->>'deliveryType')::delivery_type;
  v_code           := nullif(btrim(coalesce(payload->>'promoCode', '')), '');

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

  -- ---- create the order shell with a unique short code (retry on collision) ----
  loop
    v_short_code := gen_order_short_code();
    begin
      insert into orders (customer_name, customer_phone, address, delivery_type,
                          notes, status, total_cop, promo_code, discount_total, short_code)
      values (v_customer_name, v_customer_phone, v_address, v_delivery_type,
              v_notes, 'pending', 0, null, 0, v_short_code)
      returning id into v_order_id;
      exit; -- inserted successfully
    exception when unique_violation then
      -- extremely rare; try another code
    end;
  end loop;

  -- ---- price each item from the catalog, with inventory checks (0003) ----
  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);

    if v_qty <= 0 then
      raise exception 'invalid_qty';
    end if;

    -- Lock the row to serialize concurrent stock decrements.
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
    -- line_total_cop is GENERATED (0001_init.sql); never assigned here.

    -- Decrement only when tracked.
    if v_product.stock_qty is not null then
      update products set stock_qty = stock_qty - v_qty where id = v_product.id;
    end if;

    v_total := v_total + (v_product.price_cop * v_qty);
  end loop;

  -- ---- promo: recompute server-side; reject invalid; redeem atomically (0004) ----
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

  return v_short_code;
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;
