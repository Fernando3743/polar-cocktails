import { Hero } from "@/components/sections/Hero";
import { Nuevo } from "@/components/sections/Nuevo";
import { Sabores } from "@/components/sections/Sabores";
import { Combos } from "@/components/sections/Combos";
import { Nosotros } from "@/components/sections/Nosotros";
import { InfoRow } from "@/components/sections/InfoRow";
import { HomeVideo } from "@/components/sections/HomeVideo";
import { Snowfall } from "@/components/layout/Snowfall";
import { JsonLd } from "@/components/seo/JsonLd";
import { getProducts, getCategories } from "@/lib/queries/menu";
import { getCombos } from "@/lib/queries/combos";
import { getPromoBanners } from "@/lib/queries/promos";
import { getShopSettings, getSiteAssets } from "@/lib/queries/site";
import { SEED_SITE_ASSETS } from "@/lib/seed-data";
import type { AssetSlot } from "@/lib/types";

// Resolve a hero slot to its DB URL, or undefined when it still matches the
// seed value. Returning undefined lets <Hero> keep its bundled static import
// (which carries the blur placeholder and is always present at build time);
// only a genuine Supabase upload is threaded through as a remote URL.
function heroOverride(
  bySlot: Map<AssetSlot, { url: string }>,
  slot: AssetSlot,
): string | undefined {
  const url = bySlot.get(slot)?.url;
  const seed = SEED_SITE_ASSETS.find((a) => a.slot === slot)?.url;
  return url && url !== seed ? url : undefined;
}

export default async function Home() {
  // Site assets + settings fall back to seed data in demo mode and before
  // migration 0007, so "/" still statically generates from seed data.
  const [products, categories, combos, promoBanners, assets, settings] =
    await Promise.all([
      getProducts(),
      getCategories(),
      getCombos(),
      getPromoBanners(),
      getSiteAssets(),
      getShopSettings(),
    ]);

  const bySlot = new Map(assets.map((a) => [a.slot, a]));
  const heroDesktopUrl = heroOverride(bySlot, "hero_desktop");
  const heroMobileUrl = heroOverride(bySlot, "hero_mobile");

  return (
    <>
      <Snowfall />
      <JsonLd />
      <div className="relative z-10">
        <Hero
          heroDesktopUrl={heroDesktopUrl}
          heroMobileUrl={heroMobileUrl}
          whatsappNumber={settings.whatsappNumber}
        />
        <Nuevo banners={promoBanners} />
        <Sabores products={products} categories={categories} />
        <Combos combos={combos} />
        <Nosotros />
        <HomeVideo />
        <InfoRow
          addressLines={settings.addressLines}
          mapsUrl={settings.mapsUrl}
          openingHours={settings.openingHours}
          whatsappNumber={settings.whatsappNumber}
        />
      </div>
    </>
  );
}
