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
  total_cop: number;
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
    totalCop: row.total_cop,
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
      "id, customer_name, customer_phone, address, delivery_type, notes, status, total_cop, created_at",
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
 * Admin: a single order with its line items, or null when not found / no DB.
 */
export async function getOrderById(id: string): Promise<Order | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, address, delivery_type, notes, status, total_cop, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (orderError || !orderData) {
    return null;
  }

  const { data: itemsData } = await supabase
    .from("order_items")
    .select(
      "id, product_id, product_name, qty, unit_price_cop, line_total_cop",
    )
    .eq("order_id", id);

  const order = mapOrderRow(orderData as OrderRow);
  order.items = ((itemsData as OrderItemRow[] | null) ?? []).map(
    mapOrderItemRow,
  );

  return order;
}
