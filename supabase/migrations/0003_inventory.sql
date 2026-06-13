-- Polar - inventory & sold-out control (migration 0003).
-- Apply by hand in the Supabase SQL editor AFTER 0001_init.sql and 0002_rls.sql.
--
-- Adds a manual sold_out flag and an OPTIONAL tracked stock_qty (null = untracked),
-- and re-checks both atomically inside create_order. Rows are locked FOR UPDATE so
-- concurrent orders cannot oversell tracked stock. Server-side price recompute is
-- preserved; client prices/discounts are never trusted.

-- ---------------------------------------------------------------------------
-- Columns + index (idempotent)
-- ---------------------------------------------------------------------------
alter table products
  add column if not exists sold_out boolean not null default false;

alter table products
  add column if not exists stock_qty integer
    check (stock_qty is null or stock_qty >= 0);

create index if not exists products_sold_out_idx on products (sold_out);

-- No new RLS policies: products_public_read / products_admin_all (0002_rls.sql)
-- already cover the new columns. Public read still returns sold-out rows so the
-- storefront can show an "Agotado" badge.

-- ---------------------------------------------------------------------------
-- create_order(payload jsonb) returns uuid
--
-- This is the 0002_rls.sql create_order verbatim PLUS sold_out / stock_qty
-- handling: each product row is locked FOR UPDATE, sold-out raises
-- 'product_sold_out', insufficient tracked stock raises 'insufficient_stock',
-- and tracked stock is decremented inside the same transaction. Any raise rolls
-- back the partially-inserted order shell and items - no order persists when an
-- item is unavailable.
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
begin
  v_customer_name  := btrim(coalesce(payload->>'customerName', ''));
  v_customer_phone := btrim(coalesce(payload->>'customerPhone', ''));
  v_address        := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_notes          := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_delivery_type  := (payload->>'deliveryType')::delivery_type;

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

  insert into orders (customer_name, customer_phone, address, delivery_type, notes, status, total_cop)
  values (v_customer_name, v_customer_phone, v_address, v_delivery_type, v_notes, 'pending', 0)
  returning id into v_order_id;

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

    -- Decrement only when tracked.
    if v_product.stock_qty is not null then
      update products set stock_qty = stock_qty - v_qty where id = v_product.id;
    end if;

    v_total := v_total + (v_product.price_cop * v_qty);
  end loop;

  update orders set total_cop = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;
