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
