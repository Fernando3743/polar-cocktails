import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_SHOP_SETTINGS, SEED_SITE_ASSETS } from "@/lib/seed-data";
import type {
  AssetSlot,
  OpeningHour,
  ShopSettings,
  SiteAsset,
} from "@/lib/types";

interface SiteAssetRow {
  slot: string;
  url: string | null;
  href: string | null;
  sort_order: number | null;
}

interface ShopSettingsRow {
  whatsapp_number: string | null;
  address_lines: string[] | null;
  maps_url: string | null;
  social_links: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
  } | null;
  opening_hours: unknown;
}

/**
 * Cached site assets read (DB mode only). Returns null on error so the seed
 * fallback stays a per-request value and is never persisted in the cache. The
 * select is wrapped in try/catch because the site_assets table may not exist
 * yet (migration 0007 is applied by hand), in which case Supabase returns an
 * error and we fall back to seed.
 */
const getCachedSiteAssets = unstable_cache(
  async (): Promise<SiteAsset[] | null> => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("site_assets")
        .select("slot, url, href, sort_order");

      if (error || !data || data.length === 0) {
        return null;
      }

      return mergeSiteAssets(data as SiteAssetRow[]);
    } catch {
      return null;
    }
  },
  ["site_assets"],
  { tags: ["site_assets"], revalidate: 3600 },
);

/**
 * Start from the seed slots and override each slot present (with a non-empty
 * url) in the DB. A slot missing from the DB keeps its seed value, and an empty
 * url never blanks a seed slot.
 */
function mergeSiteAssets(rows: SiteAssetRow[]): SiteAsset[] {
  const validSlots = new Set<AssetSlot>(SEED_SITE_ASSETS.map((a) => a.slot));
  const overrides = new Map<AssetSlot, SiteAssetRow>();
  for (const row of rows) {
    if (validSlots.has(row.slot as AssetSlot) && row.url) {
      overrides.set(row.slot as AssetSlot, row);
    }
  }

  return SEED_SITE_ASSETS.map((seed) => {
    const row = overrides.get(seed.slot);
    if (!row || !row.url) return seed;
    return {
      slot: seed.slot,
      url: row.url,
      href: row.href ?? seed.href,
      sortOrder:
        typeof row.sort_order === "number" ? row.sort_order : seed.sortOrder,
    };
  });
}

/**
 * Public site assets (hero, logo, OG card, Instagram tiles). Never throws.
 * Demo mode and any DB error/empty result fall back to SEED_SITE_ASSETS; when
 * DB rows exist they are merged onto the seed so no slot is ever blanked.
 */
export async function getSiteAssets(): Promise<SiteAsset[]> {
  if (!hasSupabaseEnv()) {
    return SEED_SITE_ASSETS;
  }

  const cached = await getCachedSiteAssets();
  return cached ?? SEED_SITE_ASSETS;
}

/**
 * Coerce the opening_hours jsonb into the OpeningHour[] shape, dropping any
 * malformed entries. Falls back to the seed value when the column is empty or
 * not an array.
 */
function mapOpeningHours(value: unknown): OpeningHour[] {
  if (!Array.isArray(value)) {
    return SEED_SHOP_SETTINGS.openingHours;
  }
  const hours = value
    .filter(
      (entry): entry is { label: unknown; value: unknown } =>
        typeof entry === "object" && entry !== null,
    )
    .map((entry) => ({
      label: typeof entry.label === "string" ? entry.label : "",
      value: typeof entry.value === "string" ? entry.value : "",
    }))
    .filter((entry) => entry.label !== "" || entry.value !== "");

  return hours.length > 0 ? hours : SEED_SHOP_SETTINGS.openingHours;
}

/**
 * Map the shop_settings row (snake_case) onto the ShopSettings shape, falling
 * back field-by-field to the seed for any null/empty column.
 */
function mapShopSettings(row: ShopSettingsRow): ShopSettings {
  const addressLines =
    Array.isArray(row.address_lines) && row.address_lines.length > 0
      ? row.address_lines
      : SEED_SHOP_SETTINGS.addressLines;
  const social = row.social_links ?? {};

  return {
    whatsappNumber: row.whatsapp_number || SEED_SHOP_SETTINGS.whatsappNumber,
    addressLines,
    mapsUrl: row.maps_url || SEED_SHOP_SETTINGS.mapsUrl,
    socialLinks: {
      instagram: social.instagram || SEED_SHOP_SETTINGS.socialLinks.instagram,
      facebook: social.facebook || SEED_SHOP_SETTINGS.socialLinks.facebook,
      tiktok: social.tiktok || SEED_SHOP_SETTINGS.socialLinks.tiktok,
    },
    openingHours: mapOpeningHours(row.opening_hours),
  };
}

/**
 * Cached shop settings read (DB mode only). Returns null on error/missing row
 * so the seed fallback stays a per-request value. The select is wrapped in
 * try/catch because the shop_settings table may not exist yet (migration 0007).
 */
const getCachedShopSettings = unstable_cache(
  async (): Promise<ShopSettings | null> => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("shop_settings")
        .select(
          "whatsapp_number, address_lines, maps_url, social_links, opening_hours",
        )
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return mapShopSettings(data as ShopSettingsRow);
    } catch {
      return null;
    }
  },
  ["shop_settings"],
  { tags: ["shop_settings"], revalidate: 3600 },
);

/**
 * Owner-editable shop settings (WhatsApp, address, maps, socials, hours). Never
 * throws. Demo mode and any DB error/missing row fall back to
 * SEED_SHOP_SETTINGS; when a row exists each field falls back individually to
 * the seed for any null/empty value.
 */
export async function getShopSettings(): Promise<ShopSettings> {
  if (!hasSupabaseEnv()) {
    return SEED_SHOP_SETTINGS;
  }

  const cached = await getCachedShopSettings();
  return cached ?? SEED_SHOP_SETTINGS;
}
