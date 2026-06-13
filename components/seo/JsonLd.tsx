import { getProducts } from "@/lib/queries/menu";
import { siteUrl, SITE_DESCRIPTION } from "@/lib/seo";
import {
  SITE_NAME,
  ADDRESS_LINES,
  MAPS_URL,
  WHATSAPP_NUMBER,
  SOCIAL_LINKS,
  OPENING_HOURS,
  GEO,
} from "@/lib/config";

// Placeholder digits-only WhatsApp number; while this is set we must not emit a
// fake telephone in structured data (SEO-005).
const PLACEHOLDER_WHATSAPP = "573000000000";

export async function JsonLd() {
  const origin = siteUrl();
  // Branches on hasSupabaseEnv() and falls back to seed data automatically.
  const products = await getProducts();

  // Only real (non-"#") social URLs belong in sameAs; omit the key when empty.
  const sameAs = SOCIAL_LINKS.map((s) => s.href).filter(
    (href) => href !== "#",
  );

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
    ...(WHATSAPP_NUMBER !== PLACEHOLDER_WHATSAPP
      ? { telephone: `+${WHATSAPP_NUMBER}` }
      : {}),
    hasMap: MAPS_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS_LINES.slice(1).join(", "),
      addressLocality: "Tuluá",
      addressRegion: "Valle del Cauca",
      addressCountry: "CO",
    },
    areaServed: { "@type": "City", name: "Tuluá" },
    // Spread real social profiles only; nothing emitted while all are "#".
    ...(sameAs.length > 0 ? { sameAs } : {}),
    // Wire-now-activate-later: emit hours only once real data lands in config.
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
