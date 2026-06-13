"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import { shopSettingsSchema, siteAssetSchema } from "@/lib/validation/schemas";
import type { AssetSlot, ShopSettings } from "@/lib/types";

export type SiteActionResult = { ok: true } | { ok: false; error: string };

/**
 * Persists a single editable image slot (hero, logo, OG card, Instagram tiles)
 * to `site_assets`, keyed by `slot`. The url reuses the shared image guard
 * (IMG-1/IMG-2) via `siteAssetSchema`; `href` is an optional outbound link.
 */
export async function upsertSiteAsset(
  slot: AssetSlot,
  data: { url: string; href?: string | null },
): Promise<SiteActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Configura Supabase para guardar cambios." };
  }

  const parsed = siteAssetSchema.safeParse({
    slot,
    url: data.url,
    href: data.href ?? "",
    sortOrder: 0,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_assets").upsert(
    {
      slot: parsed.data.slot,
      url: parsed.data.url,
      href: parsed.data.href,
      sort_order: parsed.data.sortOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slot" },
  );

  if (error) {
    return { ok: false, error: "No pudimos guardar la imagen." };
  }

  // revalidateTag busts the unstable_cache entry in lib/queries/site.ts
  // (revalidatePath alone does NOT invalidate tagged unstable_cache reads), so
  // an uploaded image shows immediately instead of after the 1h revalidate.
  revalidateTag("site_assets", "max");
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin/branding");
  return { ok: true };
}

/**
 * Persists the shop's contact/social/hours settings to the single
 * `shop_settings` row (id = true). Maps camelCase input to snake_case columns.
 */
export async function updateShopSettings(
  input: ShopSettings,
): Promise<SiteActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Configura Supabase para guardar cambios." };
  }

  const parsed = shopSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shop_settings").upsert(
    {
      id: true,
      whatsapp_number: parsed.data.whatsappNumber,
      address_lines: parsed.data.addressLines,
      maps_url: parsed.data.mapsUrl,
      social_links: parsed.data.socialLinks,
      opening_hours: parsed.data.openingHours,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false, error: "No pudimos guardar la configuración." };
  }

  // See upsertSiteAsset: revalidateTag is what actually busts the cached read.
  revalidateTag("shop_settings", "max");
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin/settings");
  return { ok: true };
}
