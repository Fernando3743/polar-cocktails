import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Analytics } from "@/components/seo/Analytics";
import { getShopSettings, getSiteAssets } from "@/lib/queries/site";
import type { AssetSlot } from "@/lib/types";

const INSTAGRAM_SLOTS: AssetSlot[] = [
  "instagram_1",
  "instagram_2",
  "instagram_3",
  "instagram_4",
  "instagram_5",
];

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Both queries fall back to seed data in demo mode and before migration 0007,
  // so the chrome always renders identically to the prototype.
  const [assets, settings] = await Promise.all([
    getSiteAssets(),
    getShopSettings(),
  ]);

  const bySlot = new Map(assets.map((a) => [a.slot, a]));
  const logoUrl = bySlot.get("logo")?.url;

  // Build the 5 footer gallery tiles from the instagram_* slots, in order. Each
  // tile's outbound href falls back to the shop's Instagram profile when the
  // slot has no explicit href.
  const galleryTiles: { url: string; href: string }[] = [];
  for (const slot of INSTAGRAM_SLOTS) {
    const asset = bySlot.get(slot);
    if (!asset?.url) continue;
    galleryTiles.push({
      url: asset.url,
      href: asset.href || settings.socialLinks.instagram,
    });
  }

  return (
    <Providers>
      <a
        href="#contenido"
        className="sr-only rounded-full bg-polar-purple px-5 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:shadow-[0_8px_24px_rgba(146,40,218,0.4)]"
      >
        Saltar al contenido
      </a>
      <Navbar logoUrl={logoUrl} />
      <main id="contenido">{children}</main>
      <Footer
        logoUrl={logoUrl}
        galleryTiles={galleryTiles}
        socials={settings.socialLinks}
        addressLines={settings.addressLines}
      />
      <MobileBottomNav />
      <CartDrawer />
      <Analytics />
    </Providers>
  );
}
