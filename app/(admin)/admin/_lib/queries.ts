import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_PROMOS } from "@/lib/seed-data";
import type { AdminPromo, Category, Product } from "@/lib/types";

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

interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cop: number;
  accent_color: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  sold_out: boolean;
  stock_qty: number | null;
  category_id: string;
  category:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
}

function pickCategory(
  category: AdminProductRow["category"],
): { name: string; slug: string } | null {
  if (!category) return null;
  return Array.isArray(category) ? (category[0] ?? null) : category;
}

function mapProduct(row: AdminProductRow): AdminProduct {
  const category = pickCategory(row.category);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceCop: row.price_cop,
    accentColor: row.accent_color,
    imageUrl: row.image_url,
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? "",
    categoryId: row.category_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    soldOut: row.sold_out,
    stockQty: row.stock_qty,
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

interface AdminPromoRow {
  id: string;
  code: string;
  type: AdminPromo["type"];
  value: number;
  min_subtotal: number | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
}

/** All promo codes, ordered by code. Seed fallback in demo mode. */
export async function getAdminPromos(): Promise<AdminPromo[]> {
  if (!hasSupabaseEnv()) {
    return SEED_PROMOS.map((p, index) => ({
      id: `seed-promo-${index}`,
      code: p.code,
      type: p.type,
      value: p.value,
      minSubtotalCop: p.minSubtotalCop,
      active: p.active,
      startsAt: null,
      endsAt: null,
      maxRedemptions: null,
      timesRedeemed: 0,
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promos")
    .select(
      "id, code, type, value, min_subtotal, active, starts_at, ends_at, max_redemptions, times_redeemed",
    )
    .order("code", { ascending: true });

  if (error || !data) return [];
  return (data as AdminPromoRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    minSubtotalCop: row.min_subtotal,
    active: row.active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxRedemptions: row.max_redemptions,
    timesRedeemed: row.times_redeemed,
  }));
}
