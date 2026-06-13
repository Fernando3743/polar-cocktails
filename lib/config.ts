// TODO: replace with the shop's real WhatsApp number (digits only, country code first).
export const WHATSAPP_NUMBER = "573000000000";

export const ADDRESS_LINES = [
  "Tuluá",
  "Calle 41a # 26-81",
  "Paso ancho príncipe",
];

export const MAPS_URL =
  "https://maps.google.com/?q=Calle+41a+%2326-81+Tulua";

export const SITE_NAME = "Polar";

// Social profile URLs. Hrefs are "#" placeholders until the shop's real
// profiles land; once a real URL is set here it auto-populates the Footer
// links and the Restaurant node's sameAs in components/seo/JsonLd.tsx.
export interface SocialLink {
  label: string;
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "TikTok", href: "#" },
];

// Structured-data opening hours, e.g.
//   [{ dayOfWeek: ["Friday", "Saturday"], opens: "16:00", closes: "23:00" }]
// Pending real hours from the client; emit nothing while empty.
export interface OpeningHours {
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

export const OPENING_HOURS: OpeningHours[] = [];

// Structured-data geo coordinates. Pending real coordinates from the client;
// stays null so no empty geo node is emitted.
export interface Geo {
  latitude: number;
  longitude: number;
}

export const GEO: Geo | null = null;

// The canonical production origin for metadata (metadataBase, Open Graph,
// sitemap, robots) lives in lib/seo.ts siteUrl(), which reads NEXT_PUBLIC_SITE_URL.

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Inicio", href: "/" },
  { label: "Menú", href: "/menu" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Ubicación", href: "#ubicacion" },
  { label: "Contacto", href: "#contacto" },
];

export function whatsappUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
