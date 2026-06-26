import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_PROMO_BANNERS } from "@/lib/seed-data";
import { mapProductRow, type ProductRowBase } from "@/lib/product-mapper";
import type { PromoBanner } from "@/lib/types";

// The embedded product columns (PostgREST `product:products(...)`) must match
// what mapProductRow consumes, including the nested category embed.
const PROMO_PRODUCT_SELECT =
  "product:products(id, name, slug, description, price_cop, accent_color, image_url, sort_order, is_active, sold_out, stock_qty, category:categories(name, slug))";

interface PromoBannerRow {
  id: string;
  heading: string;
  image_url: string | null;
  href: string | null;
  sort_order: number;
  is_active: boolean;
  // PostgREST may type a to-one embed as an object or a single-element array.
  product: ProductRowBase | ProductRowBase[] | null;
}

function pickProduct(
  product: PromoBannerRow["product"],
): ProductRowBase | null {
  if (!product) return null;
  return Array.isArray(product) ? (product[0] ?? null) : product;
}

function mapPromoBannerRow(row: PromoBannerRow): PromoBanner {
  const productRow = pickProduct(row.product);
  // Only surface an active product as the COMPRAR target; an inactive/sold-out
  // product would fail at checkout, so fall back to href in that case.
  const product =
    productRow && productRow.is_active ? mapProductRow(productRow) : null;
  return {
    id: row.id,
    heading: row.heading,
    imageUrl: row.image_url,
    href: row.href,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    product,
  };
}

/**
 * Cached public promo banners read (DB mode only). Returns null on error so the
 * seed fallback stays a per-request value. The select is wrapped in try/catch
 * because the promo_banners table may not exist yet (migration 0014).
 */
const getCachedPromoBanners = unstable_cache(
  async (): Promise<PromoBanner[] | null> => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("promo_banners")
        .select(
          `id, heading, image_url, href, sort_order, is_active, ${PROMO_PRODUCT_SELECT}`,
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data) {
        return null;
      }

      return (data as unknown as PromoBannerRow[]).map(mapPromoBannerRow);
    } catch {
      return null;
    }
  },
  ["promo_banners"],
  { tags: ["promo_banners"], revalidate: 3600 },
);

/**
 * Public promo banners. Never throws. Demo mode returns SEED_PROMO_BANNERS; in
 * DB mode the table starts empty (the owner adds banners in /admin) and any
 * error falls back to seed.
 */
export async function getPromoBanners(): Promise<PromoBanner[]> {
  if (!hasSupabaseEnv()) {
    return SEED_PROMO_BANNERS;
  }

  const cached = await getCachedPromoBanners();
  return cached ?? SEED_PROMO_BANNERS;
}
