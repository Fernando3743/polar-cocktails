import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "@/lib/seed-data";
import { mapProductRow, type ProductRowBase } from "@/lib/product-mapper";
import type { Category, Product } from "@/lib/types";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
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
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) {
      return null;
    }

    return (data as unknown as ProductRowBase[]).map(mapProductRow);
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
