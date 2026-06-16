import { Hero } from "@/components/sections/Hero";
import { Sabores } from "@/components/sections/Sabores";
import { Nosotros } from "@/components/sections/Nosotros";
import { InfoRow } from "@/components/sections/InfoRow";
import { HomeVideo } from "@/components/sections/HomeVideo";
import { Snowfall } from "@/components/layout/Snowfall";
import { JsonLd } from "@/components/seo/JsonLd";
import { getProducts, getCategories } from "@/lib/queries/menu";
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
  const [products, categories, assets, settings] = await Promise.all([
    getProducts(),
    getCategories(),
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
        <Sabores products={products} categories={categories} />
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
