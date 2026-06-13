import { getProducts } from "@/lib/queries/menu";
import { siteUrl } from "@/lib/seo";
import {
  SITE_NAME,
  ADDRESS_LINES,
  MAPS_URL,
  WHATSAPP_NUMBER,
} from "@/lib/config";

export async function JsonLd() {
  const origin = siteUrl();
  // Branches on hasSupabaseEnv() and falls back to seed data automatically.
  const products = await getProducts();

  const business = {
    "@type": "Restaurant",
    "@id": `${origin}/#business`,
    name: SITE_NAME,
    url: origin,
    image: `${origin}/opengraph-image.png`,
    servesCuisine: "Cócteles granizados",
    priceRange: "$$",
    telephone: `+${WHATSAPP_NUMBER}`,
    hasMap: MAPS_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS_LINES.slice(1).join(", "),
      addressLocality: "Tuluá",
      addressRegion: "Valle del Cauca",
      addressCountry: "CO",
    },
  };

  const items = products.map((p) => ({
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.imageUrl
      ? `${origin}${p.imageUrl}`
      : `${origin}/opengraph-image.png`,
    category: p.categoryName,
    offers: {
      "@type": "Offer",
      // Raw integer COP as a plain string, e.g. "18000" — never formatCop().
      price: String(p.priceCop),
      priceCurrency: "COP",
      availability: p.soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: { "@id": `${origin}/#business` },
    },
  }));

  const json = {
    "@context": "https://schema.org",
    "@graph": [business, ...items],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
