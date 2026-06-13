import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "@/lib/seed-data";
import type { Category, Product } from "@/lib/types";

/**
 * Cookieless anon client for the public catalog. The storefront catalog is
 * identical for every visitor, so it is read without cookies/session. This is
 * required because `unstable_cache` callbacks must not access request-scoped
 * data such as cookies(). Only constructed in DB mode (env vars present).
 */
function createPublicClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface ProductRow {
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
  category: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

function pickCategory(
  category: ProductRow["category"],
): { name: string; slug: string } | null {
  if (!category) return null;
  return Array.isArray(category) ? category[0] ?? null : category;
}

function mapProductRow(row: ProductRow): Product {
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
    sortOrder: row.sort_order,
    isActive: row.is_active,
    soldOut: row.sold_out,
    stockQty: row.stock_qty,
  };
}

/**
 * Cached public categories read (DB mode only). Returns null on error so the
 * seed fallback stays a per-request value and is never persisted in the cache.
 */
const getCachedCategories = unstable_cache(
  async (): Promise<Category[] | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return null;
    }

    return (data as CategoryRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sortOrder: row.sort_order,
    }));
  },
  ["categories"],
  { tags: ["categories"], revalidate: 3600 },
);

export async function getCategories(): Promise<Category[]> {
  if (!hasSupabaseEnv()) {
    return SEED_CATEGORIES;
  }

  const cached = await getCachedCategories();
  return cached ?? SEED_CATEGORIES;
}

/**
 * Cached public products read (DB mode only). Returns null on error so the
 * seed fallback stays a per-request value and is never persisted in the cache.
 */
const getCachedProducts = unstable_cache(
  async (): Promise<Product[] | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, slug, description, price_cop, accent_color, image_url, sort_order, is_active, sold_out, stock_qty, category:categories(name, slug)",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return null;
    }

    return (data as unknown as ProductRow[]).map(mapProductRow);
  },
  ["products"],
  { tags: ["products"], revalidate: 3600 },
);

export async function getProducts(): Promise<Product[]> {
  if (!hasSupabaseEnv()) {
    return SEED_PRODUCTS;
  }

  const cached = await getCachedProducts();
  return cached ?? SEED_PRODUCTS;
}
