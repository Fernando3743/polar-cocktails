-- Polar - remove promo codes / discounts (migration 0010).
-- Apply after 0001..0009.
--
-- This removes the promo feature from the final schema while preserving the
-- current order flow: create_order still validates customer data, recomputes
-- catalog prices server-side, enforces inventory, writes order_items, decrements
-- tracked stock, assigns a POL- short code, and returns an authoritative JSON
-- summary. It no longer accepts, validates, redeems, stores, or returns promo
-- codes or discounts.

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
  v_qty            integer;
  v_product        record;
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
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);

    if v_qty <= 0 then
      raise exception 'invalid_qty';
    end if;

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

drop function if exists validate_promo(text, integer);

do $$
begin
  if to_regclass('public.promos') is not null then
    drop policy if exists promos_admin_all on promos;
    drop trigger if exists promos_set_updated_at on promos;
  end if;
end;
$$;

drop table if exists promos;
drop type if exists promo_type;

alter table orders drop column if exists promo_code;
alter table orders drop column if exists discount_total;
