/** Absolute site origin, no trailing slash. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  // Prefer the stable production host over the ephemeral per-deployment VERCEL_URL.
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // No env-provided origin. In production, default to the known stable domain so
  // canonical/OG/sitemap/JSON-LD URLs are correct rather than localhost (this also
  // covers the zero-env static build: NODE_ENV=production with no VERCEL, the
  // demo/seed correctness gate). NEXT_PUBLIC_SITE_URL still overrides for any
  // other deploy target.
  if (process.env.NODE_ENV === "production") return "https://polarcocktails.com";
  return "http://localhost:3000";
}

// Shared alt text for the file-convention social images, reused by every page's
// OG/Twitter image entry.
const SOCIAL_IMAGE_ALT = "Polar — Cócteles Granizados en Tuluá";

interface PageMetadataInput {
  /** The page <title> (template-wrapped by the root layout). */
  title: string;
  /** Description used for <meta name="description"> and the social cards. */
  description: string;
  /** Route path for the canonical + og:url, e.g. "/menu". */
  path: string;
  /**
   * OG/Twitter card title (typically "<Label> — Polar"). Falls back to `title`
   * when omitted.
   */
  socialTitle?: string;
}

/**
 * Builds the canonical + OpenGraph + Twitter metadata block shared by the
 * static content pages (menu, contacto, ubicacion, nosotros). A per-route
 * `openGraph`/`twitter` object REPLACES the root's rather than deep-merging, so
 * the shared file-convention images are re-attached here explicitly.
 */
export function pageMetadata({
  title,
  description,
  path,
  socialTitle,
}: PageMetadataInput) {
  const cardTitle = socialTitle ?? title;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: cardTitle,
      description,
      url: path,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: cardTitle,
      description,
      images: [
        {
          url: "/twitter-image.png",
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
  };
}

export const SITE_DESCRIPTION =
  "Cócteles granizados con una explosión de frescura en Tuluá. " +
  "12 sabores diferentes y 8 combinaciones únicas. Pide por WhatsApp y paga al recibir.";

export const SITE_KEYWORDS = [
  "cócteles granizados",
  "granizados Tuluá",
  "cócteles Tuluá",
  "frozen cocktails",
  "domicilios Tuluá",
  "Polar",
];
