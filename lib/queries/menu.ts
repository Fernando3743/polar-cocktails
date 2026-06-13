import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "@/lib/seed-data";
import type { Category, Product } from "@/lib/types";

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

export async function getCategories(): Promise<Category[]> {
  if (!hasSupabaseEnv()) {
    return SEED_CATEGORIES;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return SEED_CATEGORIES;
  }

  return (data as CategoryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
  }));
}

export async function getProducts(): Promise<Product[]> {
  if (!hasSupabaseEnv()) {
    return SEED_PRODUCTS;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, price_cop, accent_color, image_url, sort_order, is_active, sold_out, stock_qty, category:categories(name, slug)",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return SEED_PRODUCTS;
  }

  return (data as unknown as ProductRow[]).map(mapProductRow);
}
