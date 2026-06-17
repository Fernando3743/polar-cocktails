import type { Product } from "@/lib/types";

/** Embedded category shape from a PostgREST `category:categories(...)` join.
 *  PostgREST may type the relationship as an object or a single-element array,
 *  so both are accepted. */
export type EmbeddedCategory =
  | { name: string; slug: string }
  | { name: string; slug: string }[]
  | null;

/** The product columns shared by the public and admin selects (the admin select
 *  adds `category_id` on top). */
export interface ProductRowBase {
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
  category: EmbeddedCategory;
}

/** Normalize the embedded category (object | single-element array | null). */
export function pickCategory(
  category: EmbeddedCategory,
): { name: string; slug: string } | null {
  if (!category) return null;
  return Array.isArray(category) ? (category[0] ?? null) : category;
}

/** Map a product row to the storefront Product shape. The admin mapper layers
 *  `categoryId` on top of this. */
export function mapProductRow(row: ProductRowBase): Product {
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
