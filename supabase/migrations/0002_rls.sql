-- Polar — Row Level Security policies + the create_order RPC.
--
-- Model:
--   * Public (anon + authenticated) may READ only ACTIVE categories/products.
--   * Anonymous customers may INSERT orders, and INSERT order_items only when the
--     parent order already exists. They may NOT select/update/delete orders or items,
--     and may NOT read inactive catalog rows.
--   * Authenticated users (the admin) get full access to all four tables.
--   * create_order(payload jsonb) is SECURITY DEFINER so it can look up prices and
--     insert atomically regardless of the caller's row-level permissions.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table categories  enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
drop policy if exists categories_public_read on categories;
create policy categories_public_read
  on categories
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists categories_admin_all on categories;
create policy categories_admin_all
  on categories
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
drop policy if exists products_public_read on products;
create policy products_public_read
  on products
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists products_admin_all on products;
create policy products_admin_all
  on products
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- orders
-- No public SELECT: customers cannot read orders back.
-- Anonymous customers may insert; the admin gets full access.
-- ---------------------------------------------------------------------------
drop policy if exists orders_anon_insert on orders;
create policy orders_anon_insert
  on orders
  for insert
  to anon
  with check (true);

drop policy if exists orders_admin_all on orders;
create policy orders_admin_all
  on orders
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- order_items
-- Anonymous insert only when the parent order exists; admin full access.
-- ---------------------------------------------------------------------------
drop policy if exists order_items_anon_insert on order_items;
create policy order_items_anon_insert
  on order_items
  for insert
  to anon
  with check (
    exists (select 1 from orders o where o.id = order_items.order_id)
  );

drop policy if exists order_items_admin_all on order_items;
create policy order_items_admin_all
  on order_items
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- create_order(payload jsonb) RPC
--
-- payload shape:
--   {
--     "customerName":  text,
--     "customerPhone": text,
--     "address":       text | null,
--     "deliveryType":  "delivery" | "pickup",
--     "notes":         text | null,
--     "items": [ { "productId": uuid, "qty": int }, ... ]
--   }
--
-- Prices are looked up from the products table server-side; client-supplied
-- prices/totals are ignored. The order and its items are inserted atomically
-- inside one function call. Returns the new order id (uuid).
-- ---------------------------------------------------------------------------
create or replace function create_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id      uuid;
  v_delivery_type delivery_type;
  v_address       text;
  v_customer_name text;
  v_customer_phone text;
  v_notes         text;
  v_total         integer := 0;
  v_item          jsonb;
  v_product_id    uuid;
  v_qty           integer;
  v_product       record;
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

  -- Create the order shell first (total filled in after items are priced).
  insert into orders (customer_name, customer_phone, address, delivery_type, notes, status, total_cop)
  values (v_customer_name, v_customer_phone, v_address, v_delivery_type, v_notes, 'pending', 0)
  returning id into v_order_id;

  -- Price each item from the catalog (server-side source of truth).
  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);

    if v_qty <= 0 then
      raise exception 'invalid_qty';
    end if;

    select id, name, price_cop
      into v_product
      from products
     where id = v_product_id
       and is_active = true;

    if not found then
      raise exception 'product_not_found';
    end if;

    insert into order_items (order_id, product_id, product_name, qty, unit_price_cop)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price_cop);

    v_total := v_total + (v_product.price_cop * v_qty);
  end loop;

  update orders set total_cop = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;
