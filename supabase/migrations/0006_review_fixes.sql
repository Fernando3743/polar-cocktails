-- Polar - review fixes (migration 0006).
-- Apply by hand in the Supabase SQL editor AFTER 0001..0005.
--
-- This migration re-issues create_order with four targeted fixes and adds a
-- stock-restock trigger. It is the new FINAL, FULLY-CUMULATIVE definition of
-- create_order: it preserves every prior safeguard from 0005 (SECURITY DEFINER,
-- search_path hardening, anon/authenticated grants, FOR UPDATE inventory lock,
-- product_sold_out / insufficient_stock, stock decrement for tracked products,
-- the Colombian-mobile phone guard, and the short-code collision-retry loop) and
-- applies ONLY the diffs below. Server still recomputes prices/discount; client
-- values are never trusted.
--
-- Findings addressed:
--   #5  Percent-discount int4 overflow: the multiply (v_total * v_promo.value)
--       was computed in int4 BEFORE the divide and overflowed when
--       subtotal*value > 2,147,483,647. Now done in bigint:
--       floor(v_total::bigint * v_promo.value / 100)::int.
--   #4  Commit-time promo problems are now a SOFT-DROP. create_order NEVER raises
--       for a promo issue at commit: a missing / inactive / not-yet-started /
--       expired / below-min-subtotal / redemption-cap-reached code applies NO
--       discount (discount_total = 0, promo_code = null), does NOT increment
--       times_redeemed, and the order is STILL created. validate_promo (the
--       apply-time preview used by the checkout UI, 0004) is unchanged and still
--       returns Spanish reasons for invalid codes.
--   #1  create_order now RETURNS jsonb (was text). It returns the authoritative,
--       fully server-computed order summary (short_code, items[], subtotal_cop,
--       discount_total, promo_code, total_cop). The action returns it as
--       result.summary; the client builds the WhatsApp message and the on-page
--       discount banner from this summary, never from cart values.
--   #6  Cancelling an order now restores inventory. create_order decrements
--       stock_qty for tracked products at creation, but nothing restored it on
--       cancellation, permanently burning inventory. A new AFTER UPDATE OF status
--       trigger on orders adds each order_items.qty back to products.stock_qty for
--       tracked products, only on the transition INTO 'cancelled'.

-- ---------------------------------------------------------------------------
-- create_order(payload jsonb) returns jsonb - FINAL, FULLY-CUMULATIVE.
--
-- The return type changes from text (0005) to jsonb. PostgreSQL's CREATE OR
-- REPLACE FUNCTION cannot change a function's return type, so the prior
-- definition must be dropped first. Nothing in the schema depends on
-- create_order (the app calls it via rpc), so a plain DROP is safe (0005 already
-- relied on this).
-- ---------------------------------------------------------------------------
drop function if exists create_order(jsonb);

create function create_order(payload jsonb)
returns jsonb                      -- was text; now returns the order summary
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

    -- Mirror the generated line_total_cop (qty * unit_price_cop) for the summary
    -- and accumulate the authoritative items array in cart order.
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

  -- ---- promo: recompute server-side; SOFT-DROP any problem at commit (#4) ----
  -- At COMMIT time create_order never raises for a promo issue. If the applied
  -- code is missing / inactive / not-yet-started / expired / below min-subtotal /
  -- redemption-cap-reached, we apply NO discount and still create the order.
  -- validate_promo (apply-time preview, 0004) is unchanged.
  if v_code is not null then
    select * into v_promo from promos where code = v_code::citext;
    if not found or not v_promo.active
       or (v_promo.starts_at is not null and now() < v_promo.starts_at)
       or (v_promo.ends_at  is not null and now() > v_promo.ends_at)
       or (v_promo.min_subtotal is not null and v_total < v_promo.min_subtotal) then
      -- Soft-drop: invalid / unavailable code at commit -> no discount applied.
      v_code     := null;
      v_discount := 0;
    else
      -- #5: compute the percent intermediate in bigint to avoid int4 overflow
      -- when v_total * v_promo.value exceeds 2,147,483,647.
      v_raw := case when v_promo.type = 'percent'
                    then floor(v_total::bigint * v_promo.value / 100)::int
                    else v_promo.value end;
      v_discount := least(greatest(v_raw, 0), v_total);  -- clamp 0..total

      -- Atomic redemption guard against max_redemptions.
      update promos
         set times_redeemed = times_redeemed + 1
       where id = v_promo.id
         and (max_redemptions is null or times_redeemed < max_redemptions);
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        -- Soft-drop: redemption cap reached at commit -> no discount applied,
        -- no increment, order still created.
        v_code     := null;
        v_discount := 0;
      end if;
    end if;
  end if;

  update orders
     set total_cop = greatest(0, v_total - v_discount),
         promo_code = v_code,
         discount_total = v_discount
   where id = v_order_id;

  -- ---- authoritative server-computed summary (#1) ----
  return jsonb_build_object(
    'short_code',     v_short_code,
    'items',          v_items,
    'subtotal_cop',   v_total,
    'discount_total', v_discount,
    'promo_code',     v_code,
    'total_cop',      greatest(0, v_total - v_discount)
  );
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Restore inventory when an order is cancelled (#6).
--
-- create_order decrements products.stock_qty for tracked products (stock_qty is
-- not null) at creation. Nothing restored it on cancellation, so a cancelled
-- order permanently burned that stock. This AFTER UPDATE OF status trigger adds
-- each order_items.qty back to products.stock_qty for tracked products, and ONLY
-- on the transition INTO 'cancelled' (so re-saving a cancelled order, or any
-- other status change, never double-restocks). Untracked products (stock_qty is
-- null) are left untouched.
--
-- SECURITY DEFINER + hardened search_path so the restock runs regardless of the
-- caller's privileges (admin status changes flow through RLS as `authenticated`).
-- ---------------------------------------------------------------------------
create or replace function restock_on_order_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Guard: run once, only on the transition INTO 'cancelled'.
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update products p
       set stock_qty = p.stock_qty + oi.qty
      from order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id
       and p.stock_qty is not null;  -- only tracked products
  end if;
  return new;
end;
$$;

drop trigger if exists orders_restock_on_cancel on orders;
create trigger orders_restock_on_cancel
  after update of status on orders
  for each row
  execute function restock_on_order_cancel();
