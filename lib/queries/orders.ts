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
 *
 * This returns the full (unpaginated) list and is used by the dashboard for
 * aggregate stats. The orders list page uses `getOrdersPage` for pagination.
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

/** Default and only page size for the admin orders list. */
const ORDERS_PAGE_SIZE = 20;

interface GetOrdersPageOptions {
  status?: OrderStatus;
  /** Free-text search across customer name, phone and short code. */
  q?: string;
  /** 1-based page number. */
  page?: number;
  pageSize?: number;
}

export interface OrdersPage {
  orders: Order[];
  /** Total rows matching the filters (across all pages). */
  total: number;
  /** 1-based page actually served (clamped to >= 1). */
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Admin: a single page of orders, newest first, with the total matching count.
 * Supports an optional status filter and a free-text search (`q`) matched with
 * `ilike` against customer name, phone and short code. Without DB env this
 * returns an empty page (orders have no public SELECT policy).
 */
export async function getOrdersPage({
  status,
  q,
  page = 1,
  pageSize = ORDERS_PAGE_SIZE,
}: GetOrdersPageOptions = {}): Promise<OrdersPage> {
  const safePageSize = Math.max(1, pageSize);
  const emptyPage: OrdersPage = {
    orders: [],
    total: 0,
    page: 1,
    pageSize: safePageSize,
    pageCount: 0,
  };

  if (!hasSupabaseEnv()) {
    return emptyPage;
  }

  const requestedPage = Math.max(1, Math.floor(page) || 1);
  const from = (requestedPage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, address, delivery_type, notes, status, promo_code, discount_total, total_cop, short_code, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  const term = q?.trim();
  if (term) {
    // Escape PostgREST `ilike` wildcards/special chars in user input so a
    // literal % or _ is matched literally rather than as a wildcard.
    const escaped = term.replace(/[\\%_,()]/g, (ch) => `\\${ch}`);
    const pattern = `%${escaped}%`;
    query = query.or(
      `customer_name.ilike.${pattern},customer_phone.ilike.${pattern},short_code.ilike.${pattern}`,
    );
  }

  // A single fetch returns both the page rows and the full matching count
  // (PostgREST `count: exact` is independent of `range`).
  const { data, error, count } = await query;
  if (error || !data) {
    return emptyPage;
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));

  return {
    orders: (data as OrderRow[]).map(mapOrderRow),
    total,
    page: requestedPage,
    pageSize: safePageSize,
    pageCount,
  };
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
