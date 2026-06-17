import { siteUrl } from "@/lib/seo";
import { SITE_NAME } from "@/lib/config";

// Safe serialization for embedding JSON-LD inside <script>. JSON.stringify does
// not escape "</script>" or the JS line separators U+2028/U+2029, so escape "<"
// and those code points to prevent breaking out of the tag (stored XSS).
function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Structured data for /menu. Intentionally does NOT re-emit the #business
// (Restaurant) node — that lives on the homepage's JsonLd and is referenced
// here by @id only, so the business data is not spread across two URLs.
// This component needs no Supabase: it builds purely from static config and
// siteUrl(), so the zero-env build keeps /menu static.
export function MenuJsonLd() {
  const origin = siteUrl();

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${origin}/menu#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Menú",
        item: `${origin}/menu`,
      },
    ],
  };

  const webPage = {
    "@type": "WebPage",
    "@id": `${origin}/menu#webpage`,
    url: `${origin}/menu`,
    name: `Menú — ${SITE_NAME}`,
    // Reference-only @ids; the full nodes live elsewhere (homepage / site).
    isPartOf: { "@id": `${origin}/#website` },
    about: { "@id": `${origin}/#business` },
    breadcrumb: { "@id": `${origin}/menu#breadcrumb` },
  };

  const json = {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, webPage],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
