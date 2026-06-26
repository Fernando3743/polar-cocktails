import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_COMBOS } from "@/lib/seed-data";
import type { Combo } from "@/lib/types";

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

function mapComboRow(row: ComboRow): Combo {
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

/**
 * Cached public combos read (DB mode only). Returns null on error so the seed
 * fallback stays a per-request value and is never persisted in the cache. The
 * select is wrapped in try/catch because the combos table may not exist yet
 * (migration 0014 is applied by hand / via db push), in which case Supabase
 * returns an error and we fall back to seed.
 */
const getCachedCombos = unstable_cache(
  async (): Promise<Combo[] | null> => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("combos")
        .select(
          "id, name, slug, description, price_cop, accent_color, image_url, sort_order, is_active, sold_out",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data) {
        return null;
      }

      return (data as ComboRow[]).map(mapComboRow);
    } catch {
      return null;
    }
  },
  ["combos"],
  { tags: ["combos"], revalidate: 3600 },
);

/**
 * Public combos. Never throws. Demo mode returns SEED_COMBOS; in DB mode the
 * table starts empty (the owner adds combos in /admin) and any error falls back
 * to seed.
 */
export async function getCombos(): Promise<Combo[]> {
  if (!hasSupabaseEnv()) {
    return SEED_COMBOS;
  }

  const cached = await getCachedCombos();
  return cached ?? SEED_COMBOS;
}
