import { getProducts } from "@/lib/queries/menu";
import { getShopSettings } from "@/lib/queries/site";
import { siteUrl, SITE_DESCRIPTION } from "@/lib/seo";
import { SITE_NAME, OPENING_HOURS, GEO } from "@/lib/config";

// Placeholder digits-only WhatsApp number; while this is set we must not emit a
// fake telephone in structured data (SEO-005).
const PLACEHOLDER_WHATSAPP = "573000000000";

// Safe serialization for embedding JSON-LD inside <script>. JSON.stringify does
// not escape "</script>" or the JS line separators U+2028/U+2029, so escape "<"
// and those code points to prevent breaking out of the tag (stored XSS).
function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export async function JsonLd() {
  const origin = siteUrl();
  // Both branch on hasSupabaseEnv() and fall back to seed/constants automatically.
  const [products, settings] = await Promise.all([
    getProducts(),
    getShopSettings(),
  ]);

  const { whatsappNumber, addressLines, mapsUrl, socialLinks } = settings;

  // Only real (non-"#", non-empty) social URLs belong in sameAs; omit when none.
  const sameAs = [
    socialLinks.instagram,
    socialLinks.facebook,
    socialLinks.tiktok,
  ].filter((href) => href && href !== "#");

  const business = {
    "@type": "Restaurant",
    "@id": `${origin}/#business`,
    name: SITE_NAME,
    url: origin,
    image: `${origin}/opengraph-image.png`,
    description: SITE_DESCRIPTION,
    servesCuisine: "Cócteles granizados",
    priceRange: "$$",
    menu: `${origin}/menu`,
    acceptsReservations: "False",
    paymentAccepted: "Cash",
    currenciesAccepted: "COP",
    // Omit the telephone entirely while it is still the placeholder number.
    ...(whatsappNumber !== PLACEHOLDER_WHATSAPP
      ? { telephone: `+${whatsappNumber}` }
      : {}),
    hasMap: mapsUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: addressLines.slice(1).join(", "),
      addressLocality: addressLines[0] ?? "Tuluá",
      addressRegion: "Valle del Cauca",
      addressCountry: "CO",
    },
    areaServed: { "@type": "City", name: addressLines[0] ?? "Tuluá" },
    // Spread real social profiles only; nothing emitted while all are "#"/empty.
    ...(sameAs.length > 0 ? { sameAs } : {}),
    // Wire-now-activate-later: emit hours only once structured data lands in
    // config. Settings openingHours are free-form display strings (not the
    // schema.org dayOfWeek/opens/closes shape), so they drive the storefront UI
    // only; OPENING_HOURS remains the schema-valid source here.
    ...(OPENING_HOURS.length > 0
      ? {
          openingHoursSpecification: OPENING_HOURS.map((h) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: h.dayOfWeek,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
    // Emit geo only once real coordinates land in config.
    ...(GEO
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: GEO.latitude,
            longitude: GEO.longitude,
          },
        }
      : {}),
  };

  // priceValidUntil: last day of the current year (YYYY-MM-DD), recomputed each render.
  const priceValidUntil = new Date(new Date().getFullYear(), 11, 31)
    .toISOString()
    .slice(0, 10);

  const items = products.map((p) => ({
    "@type": "Product",
    "@id": `${origin}/menu#product-${p.slug}`,
    name: p.name,
    description: p.description,
    url: `${origin}/menu`,
    image: p.imageUrl
      ? // DB-mode imageUrl is an absolute Supabase Storage URL; only prefix relative paths.
        p.imageUrl.startsWith("http")
        ? p.imageUrl
        : `${origin}${p.imageUrl}`
      : `${origin}/opengraph-image.png`,
    category: p.categoryName,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      // Raw integer COP as a plain string, e.g. "18000" — never formatCop().
      price: String(p.priceCop),
      priceCurrency: "COP",
      url: `${origin}/menu`,
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil,
      // Tracked products at zero stock are sold out too; untracked stock is null/undefined.
      availability:
        p.soldOut || p.stockQty === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      seller: { "@id": `${origin}/#business` },
    },
  }));

  const website = {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: SITE_NAME,
    url: origin,
    inLanguage: "es-CO",
  };

  const json = {
    "@context": "https://schema.org",
    "@graph": [business, website, ...items],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
