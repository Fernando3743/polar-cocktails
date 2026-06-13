import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

interface OrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  delivery_type: Order["deliveryType"];
  notes: string | null;
  status: OrderStatus;
  promo_code: string | null;
  discount_total: number;
  total_cop: number;
  short_code: string | null;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price_cop: number;
  line_total_cop: number;
}

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    deliveryType: row.delivery_type,
    notes: row.notes,
    status: row.status,
    promoCode: row.promo_code,
    discountCop: row.discount_total,
    totalCop: row.total_cop,
    shortCode: row.short_code,
    createdAt: row.created_at,
  };
}

function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    qty: row.qty,
    unitPriceCop: row.unit_price_cop,
    lineTotalCop: row.line_total_cop,
  };
}

/**
 * Admin: list orders, newest first, optionally filtered by status.
 * Reads are only meaningful with a database (no public SELECT on orders);
 * without env configured this returns an empty list.
 */
export async function getOrders(status?: OrderStatus): Promise<Order[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, address, delivery_type, notes, status, promo_code, discount_total, total_cop, short_code, created_at",
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as OrderRow[]).map(mapOrderRow);
}

/**
 * A single order (with line items) looked up by a given column, or null when
 * not found / no DB. Note: the order is still RLS-gated, so anon callers get
 * null even with a valid key (orders has no public SELECT policy).
 */
async function getOrderBy(
  column: "id" | "short_code",
  value: string,
): Promise<Order | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, address, delivery_type, notes, status, promo_code, discount_total, total_cop, short_code, created_at",
    )
    .eq(column, value)
    .maybeSingle();

  if (orderError || !orderData) {
    return null;
  }

  const order = mapOrderRow(orderData as OrderRow);

  const { data: itemsData } = await supabase
    .from("order_items")
    .select(
      "id, product_id, product_name, qty, unit_price_cop, line_total_cop",
    )
    .eq("order_id", order.id);

  order.items = ((itemsData as OrderItemRow[] | null) ?? []).map(
    mapOrderItemRow,
  );

  return order;
}

/**
 * Admin: a single order with its line items by uuid, or null when not found.
 * The admin order-detail route passes the uuid `orders.id`.
 */
export async function getOrderById(id: string): Promise<Order | null> {
  return getOrderBy("id", id);
}

/**
 * A single order by its human-friendly `POL-` short code (what create_order
 * returns and the customer confirmation route uses as its param).
 */
export async function getOrderByShortCode(
  shortCode: string,
): Promise<Order | null> {
  return getOrderBy("short_code", shortCode);
}
