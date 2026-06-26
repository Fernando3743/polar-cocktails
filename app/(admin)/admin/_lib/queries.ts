import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  SEED_CATEGORIES,
  SEED_COMBOS,
  SEED_PRODUCTS,
  SEED_PROMO_BANNERS,
} from "@/lib/seed-data";
import {
  mapProductRow,
  type ProductRowBase,
} from "@/lib/product-mapper";
import type {
  Category,
  Combo,
  Order,
  OrderStatus,
  Product,
} from "@/lib/types";
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

// ---------------------------------------------------------------------------
// Combos (admin reads). Mirrors the product admin pattern: all rows including
// inactive, ordered by sort_order, with a seed fallback in demo mode.
// ---------------------------------------------------------------------------
interface ComboRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cop: number;
  accent_color: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  sold_out: boolean;
}

function mapCombo(row: ComboRow): Combo {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    priceCop: row.price_cop,
    accentColor: row.accent_color,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    soldOut: row.sold_out,
  };
}

const COMBO_SELECT =
  "id, name, slug, description, price_cop, accent_color, image_url, sort_order, is_active, sold_out";

/** All combos (including inactive), ordered by sort_order. Seed fallback. */
export async function getAdminCombos(): Promise<Combo[]> {
  if (!hasSupabaseEnv()) {
    return SEED_COMBOS;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("combos")
    .select(COMBO_SELECT)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as ComboRow[]).map(mapCombo);
}

/** A single combo by id (including inactive), or null. Seed fallback. */
export async function getAdminComboById(id: string): Promise<Combo | null> {
  if (!hasSupabaseEnv()) {
    return SEED_COMBOS.find((c) => c.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("combos")
    .select(COMBO_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapCombo(data as ComboRow);
}

// ---------------------------------------------------------------------------
// Promo banners (admin reads). The admin shape carries the raw productId (the
// COMPRAR target) rather than a resolved product, which the form needs.
// ---------------------------------------------------------------------------
export interface AdminPromoBanner {
  id: string;
  heading: string;
  imageUrl: string | null;
  href: string | null;
  productId: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface PromoBannerRow {
  id: string;
  heading: string;
  image_url: string | null;
  href: string | null;
  product_id: string | null;
  sort_order: number;
  is_active: boolean;
}

function mapPromoBanner(row: PromoBannerRow): AdminPromoBanner {
  return {
    id: row.id,
    heading: row.heading,
    imageUrl: row.image_url,
    href: row.href,
    productId: row.product_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

const PROMO_BANNER_SELECT =
  "id, heading, image_url, href, product_id, sort_order, is_active";

/** All promo banners (including inactive), ordered by sort_order. Seed fallback. */
export async function getAdminPromoBanners(): Promise<AdminPromoBanner[]> {
  if (!hasSupabaseEnv()) {
    return SEED_PROMO_BANNERS.map((b) => ({
      id: b.id,
      heading: b.heading,
      imageUrl: b.imageUrl,
      href: b.href,
      productId: b.product?.id ?? null,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_banners")
    .select(PROMO_BANNER_SELECT)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as PromoBannerRow[]).map(mapPromoBanner);
}

/** A single promo banner by id, or null. Seed fallback. */
export async function getAdminPromoBannerById(
  id: string,
): Promise<AdminPromoBanner | null> {
  if (!hasSupabaseEnv()) {
    const seed = SEED_PROMO_BANNERS.find((b) => b.id === id);
    if (!seed) return null;
    return {
      id: seed.id,
      heading: seed.heading,
      imageUrl: seed.imageUrl,
      href: seed.href,
      productId: seed.product?.id ?? null,
      sortOrder: seed.sortOrder,
      isActive: seed.isActive,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_banners")
    .select(PROMO_BANNER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapPromoBanner(data as PromoBannerRow);
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
