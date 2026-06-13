-- Polar - inventory reactivation fix (migration 0008).
-- Apply by hand in the Supabase SQL editor AFTER 0001..0007.
--
-- Finding addressed (ACT-2): the restock_on_order_cancel trigger from 0006
-- (orders_restock_on_cancel, AFTER UPDATE OF status) was asymmetric. It added
-- stock back for tracked products on the transition INTO 'cancelled', but did
-- nothing when an order was REACTIVATED (moved back OUT of 'cancelled' to
-- pending / confirmed / preparing / delivered). The restored stock was never
-- re-decremented, so cancelling then reactivating an order silently inflated
-- inventory for every tracked line.
--
-- This migration re-issues the function with CREATE OR REPLACE FUNCTION (same
-- name, signature, and orders_restock_on_cancel trigger from 0006 - no trigger
-- changes needed) to make it symmetric:
--   * INTO 'cancelled' (old.status is distinct from 'cancelled' and
--     new.status = 'cancelled')        -> ADD each order_items.qty back.
--   * OUT of 'cancelled' (old.status = 'cancelled' and new.status is distinct
--     from 'cancelled')                -> RE-DECREMENT each order_items.qty.
-- Only tracked products (stock_qty is not null) are touched; untracked products
-- (stock_qty is null) are left alone. Both branches are mutually exclusive, so a
-- single status change can never both add and subtract, and any status change
-- that does not cross the 'cancelled' boundary (e.g. pending -> confirmed, or
-- re-saving an already-cancelled order) is a no-op.
--
-- SECURITY DEFINER + hardened search_path are preserved from 0006 so the
-- adjustment runs regardless of the caller's privileges (admin status changes
-- flow through RLS as `authenticated`).

create or replace function restock_on_order_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    -- Transition INTO 'cancelled': give the stock back for tracked products.
    update products p
       set stock_qty = p.stock_qty + oi.qty
      from order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id
       and p.stock_qty is not null;  -- only tracked products
  elsif old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    -- Transition OUT of 'cancelled' (reactivation): re-take the stock that was
    -- restored on cancel, mirroring the restock above for tracked products.
    update products p
       set stock_qty = p.stock_qty - oi.qty
      from order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id
       and p.stock_qty is not null;  -- only tracked products
  end if;
  return new;
end;
$$;

-- The orders_restock_on_cancel trigger from 0006 already fires AFTER UPDATE OF
-- status for each row and calls this function, so no trigger change is required.
