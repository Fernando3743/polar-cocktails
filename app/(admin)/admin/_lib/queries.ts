import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "@/lib/seed-data";
import {
  mapProductRow,
  type ProductRowBase,
} from "@/lib/product-mapper";
import type { Category, Order, OrderStatus, Product } from "@/lib/types";
import { ORDER_STATUSES } from "./status";

/**
 * Admin product shape: the storefront Product plus the category id, which the
 * edit form needs but the public-facing query intentionally omits.
 */
export interface AdminProduct extends Product {
  categoryId: string;
}

/** Admin category shape: storefront Category plus the active flag. */
export interface AdminCategory extends Category {
  isActive: boolean;
}

/** Admin product row: the shared base columns plus the category id the edit
 *  form needs. */
interface AdminProductRow extends ProductRowBase {
  category_id: string;
}

function mapProduct(row: AdminProductRow): AdminProduct {
  // Reuse the shared base mapping, then layer on the admin-only categoryId.
  return {
    ...mapProductRow(row),
    categoryId: row.category_id,
  };
}

const PRODUCT_SELECT =
  "id, name, slug, description, price_cop, accent_color, image_url, sort_order, is_active, sold_out, stock_qty, category_id, category:categories(name, slug)";

/** All products (including inactive), ordered by sort_order. Seed fallback. */
export async function getAdminProducts(): Promise<AdminProduct[]> {
  if (!hasSupabaseEnv()) {
    return SEED_PRODUCTS.map((p) => ({
      ...p,
      categoryId:
        SEED_CATEGORIES.find((c) => c.slug === p.categorySlug)?.id ?? "",
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as AdminProductRow[]).map(mapProduct);
}

/** A single product by id (including inactive), or null. Seed fallback. */
export async function getAdminProductById(
  id: string,
): Promise<AdminProduct | null> {
  if (!hasSupabaseEnv()) {
    const seed = SEED_PRODUCTS.find((p) => p.id === id);
    if (!seed) return null;
    return {
      ...seed,
      categoryId:
        SEED_CATEGORIES.find((c) => c.slug === seed.categorySlug)?.id ?? "",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProduct(data as unknown as AdminProductRow);
}

interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

/** All categories (including inactive), ordered by sort_order. Seed fallback. */
export async function getAdminCategories(): Promise<AdminCategory[]> {
  if (!hasSupabaseEnv()) {
    return SEED_CATEGORIES.map((c) => ({ ...c, isActive: true }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, is_active")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as AdminCategoryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}

/** Aggregate figures the dashboard needs, computed without loading every row. */
export interface DashboardOrderStats {
  /** Total orders across all statuses. */
  total: number;
  /** Orders still pending. */
  pending: number;
  /** Order count per status, in workflow order. */
  countsByStatus: { status: OrderStatus; count: number }[];
  /** Sum of delivered order totals (COP). */
  revenue: number;
  /** Sum of delivered order totals created within the last 30 days (COP). */
  revenueLast30: number;
  /** The newest few orders for the dashboard list. */
  recent: Order[];
}

interface DashboardOrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  delivery_type: Order["deliveryType"];
  notes: string | null;
  status: OrderStatus;
  total_cop: number;
  short_code: string | null;
  created_at: string;
}

function mapDashboardOrderRow(row: DashboardOrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    deliveryType: row.delivery_type,
    notes: row.notes,
    status: row.status,
    totalCop: row.total_cop,
    shortCode: row.short_code,
    createdAt: row.created_at,
  };
}

/** Newest orders shown on the dashboard; pulled with a small LIMIT, not all. */
const DASHBOARD_RECENT_LIMIT = 8;
const DASHBOARD_ORDER_SELECT =
  "id, customer_name, customer_phone, address, delivery_type, notes, status, total_cop, short_code, created_at";

/**
 * Dashboard aggregates without materializing every order in Node. Status counts
 * use head-only `count: exact` requests (zero rows transferred); delivered
 * revenue reads a narrow `total_cop, created_at` projection of delivered orders
 * only; and the recent list is capped with a small LIMIT. Without DB env this
 * returns zeroed stats (orders have no public SELECT policy).
 */
export async function getDashboardOrderStats(): Promise<DashboardOrderStats> {
  const empty: DashboardOrderStats = {
    total: 0,
    pending: 0,
    countsByStatus: ORDER_STATUSES.map((status) => ({ status, count: 0 })),
    revenue: 0,
    revenueLast30: 0,
    recent: [],
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const supabase = await createClient();

  // Head-only count requests: PostgREST returns the matching count with no row
  // payload when `head: true` is paired with `count: "exact"`.
  const totalPromise = supabase
    .from("orders")
    .select("id", { count: "exact", head: true });

  const statusCountPromises = ORDER_STATUSES.map((status) =>
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", status),
  );

  // Delivered-only narrow projection for the revenue sums (far smaller than all
  // orders/all columns). force-dynamic page: read the request-time wall clock so
  // the rolling 30-day window is recomputed per request; the window is applied
  // in Node over the delivered subset.
  const sinceMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const deliveredPromise = supabase
    .from("orders")
    .select("total_cop, created_at")
    .eq("status", "delivered");

  const recentPromise = supabase
    .from("orders")
    .select(DASHBOARD_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_RECENT_LIMIT);

  const [totalRes, deliveredRes, recentRes, ...statusRes] = await Promise.all([
    totalPromise,
    deliveredPromise,
    recentPromise,
    ...statusCountPromises,
  ]);

  const countsByStatus = ORDER_STATUSES.map((status, i) => ({
    status,
    count: statusRes[i]?.count ?? 0,
  }));

  const pending =
    countsByStatus.find((c) => c.status === "pending")?.count ?? 0;

  const deliveredRows =
    (deliveredRes.data as { total_cop: number; created_at: string }[] | null) ??
    [];
  let revenue = 0;
  let revenueLast30 = 0;
  for (const row of deliveredRows) {
    revenue += row.total_cop;
    const created = Date.parse(row.created_at);
    if (!Number.isNaN(created) && created >= sinceMs) {
      revenueLast30 += row.total_cop;
    }
  }

  const recent = (
    (recentRes.data as DashboardOrderRow[] | null) ?? []
  ).map(mapDashboardOrderRow);

  return {
    total: totalRes.count ?? 0,
    pending,
    countsByStatus,
    revenue,
    revenueLast30,
    recent,
  };
}
