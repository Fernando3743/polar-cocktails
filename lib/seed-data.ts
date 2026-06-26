import {
  ADDRESS_LINES,
  MAPS_URL,
  SOCIAL_LINKS,
  WHATSAPP_NUMBER,
} from "@/lib/config";
import type {
  Category,
  Combo,
  Product,
  PromoBanner,
  ShopSettings,
  SiteAsset,
} from "@/lib/types";

export const SEED_CATEGORIES: Category[] = [
  { id: "seed-cat-frutales", name: "Frutales", slug: "frutales", sortOrder: 1 },
  {
    id: "seed-cat-tropicales",
    name: "Tropicales",
    slug: "tropicales",
    sortOrder: 2,
  },
  { id: "seed-cat-clasicos", name: "Clásicos", slug: "clasicos", sortOrder: 3 },
  {
    id: "seed-cat-especiales",
    name: "Especiales",
    slug: "especiales",
    sortOrder: 4,
  },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "seed-polar-blue",
    name: "Polar Blue",
    slug: "polar-blue",
    description: "Vodka, curaçao blue, limón y azúcar.",
    priceCop: 18000,
    accentColor: "#2EA6E0",
    imageUrl: null,
    categorySlug: "clasicos",
    categoryName: "Clásicos",
    sortOrder: 1,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-mora-polar",
    name: "Mora Polar",
    slug: "mora-polar",
    description: "Vodka, mora, limón y un toque de soda.",
    priceCop: 18000,
    accentColor: "#7B2FB0",
    imageUrl: null,
    categorySlug: "frutales",
    categoryName: "Frutales",
    sortOrder: 2,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-tropical-mix",
    name: "Tropical Mix",
    slug: "tropical-mix",
    description: "Ron, maracuyá, piña y coco.",
    priceCop: 18000,
    accentColor: "#E0A52E",
    imageUrl: null,
    categorySlug: "tropicales",
    categoryName: "Tropicales",
    sortOrder: 3,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-fresa-colada",
    name: "Fresa Colada",
    slug: "fresa-colada",
    description: "Ron, fresa, coco y piña.",
    priceCop: 18000,
    accentColor: "#E0457A",
    imageUrl: null,
    categorySlug: "tropicales",
    categoryName: "Tropicales",
    sortOrder: 4,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-mango-loco",
    name: "Mango Loco",
    slug: "mango-loco",
    description: "Vodka, mango, chile y limón.",
    priceCop: 18000,
    accentColor: "#E0612E",
    imageUrl: null,
    categorySlug: "frutales",
    categoryName: "Frutales",
    sortOrder: 5,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-polar-oreo",
    name: "Polar Oreo",
    slug: "polar-oreo",
    description: "Vodka, crema de menta, oreo y leche condensada.",
    priceCop: 18000,
    accentColor: "#3FB58A",
    imageUrl: null,
    categorySlug: "especiales",
    categoryName: "Especiales",
    sortOrder: 6,
    isActive: true,
    soldOut: false,
  },
];

// Seed combos for demo mode (no Supabase) and the static build. In DB mode the
// combos table starts empty and the owner adds real combos in /admin/combos.
// Prices mirror the design screenshots; imageUrl is null so PolarLogo stands in.
export const SEED_COMBOS: Combo[] = [
  {
    id: "seed-combo-fiesta",
    name: "Combo Fiesta",
    slug: "combo-fiesta",
    description: "Cuatro granizados + una botella para la fiesta.",
    priceCop: 139900,
    accentColor: "#9128DA",
    imageUrl: null,
    sortOrder: 1,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-combo-amigos",
    name: "Combo Amigos",
    slug: "combo-amigos",
    description: "Granizados + cervezas para compartir entre amigos.",
    priceCop: 89900,
    accentColor: "#E0A52E",
    imageUrl: null,
    sortOrder: 2,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-combo-noche",
    name: "Combo Noche",
    slug: "combo-noche",
    description: "Granizados + una botella para la noche perfecta.",
    priceCop: 124900,
    accentColor: "#5D2DA9",
    imageUrl: null,
    sortOrder: 3,
    isActive: true,
    soldOut: false,
  },
  {
    id: "seed-combo-magico",
    name: "Combo Mágico",
    slug: "combo-magico",
    description: "Granizados + botella + energizantes para subir la energía.",
    priceCop: 149900,
    accentColor: "#B231CA",
    imageUrl: null,
    sortOrder: 4,
    isActive: true,
    soldOut: false,
  },
];

// Seed promotional banners for the "Nuevo" section. Each links to an existing
// seed product so the COMPRAR button can add to the cart in demo mode. In DB
// mode the table starts empty and the owner adds banners in /admin/promos.
export const SEED_PROMO_BANNERS: PromoBanner[] = [
  {
    id: "seed-promo-moscow-mule",
    heading: "¿Ya probaste el nuevo Moscow Mule?",
    imageUrl: null,
    href: null,
    sortOrder: 1,
    isActive: true,
    product: SEED_PRODUCTS.find((p) => p.id === "seed-polar-blue") ?? null,
  },
  {
    id: "seed-promo-amarillo",
    heading: "El invitado que no puede faltar en tu fiesta",
    imageUrl: null,
    href: null,
    sortOrder: 2,
    isActive: true,
    product: SEED_PRODUCTS.find((p) => p.id === "seed-tropical-mix") ?? null,
  },
];

// Seed fallback for the editable image slots. Uses the CURRENT static paths so
// demo mode (and the build, before migration 0007 creates site_assets) renders
// the prototype imagery. href is "" for every slot; Instagram links are wired
// later via the settings social links.
export const SEED_SITE_ASSETS: SiteAsset[] = [
  {
    slot: "hero_desktop",
    url: "/images/polarheroimage.png",
    href: "",
    sortOrder: 0,
  },
  {
    slot: "hero_mobile",
    url: "/generated/polar-mobile-hero.png",
    href: "",
    sortOrder: 1,
  },
  { slot: "logo", url: "/images/polar-logo.png", href: "", sortOrder: 2 },
  { slot: "og_image", url: "/opengraph-image.png", href: "", sortOrder: 3 },
  {
    slot: "instagram_1",
    url: "/images/instagram-native-logo-1.png",
    href: "",
    sortOrder: 4,
  },
  {
    slot: "instagram_2",
    url: "/images/instagram-native-logo-2.png",
    href: "",
    sortOrder: 5,
  },
  {
    slot: "instagram_3",
    url: "/images/instagram-native-logo-3.png",
    href: "",
    sortOrder: 6,
  },
  {
    slot: "instagram_4",
    url: "/images/instagram-native-logo-4.png",
    href: "",
    sortOrder: 7,
  },
  {
    slot: "instagram_5",
    url: "/images/instagram-native-logo-5.png",
    href: "",
    sortOrder: 8,
  },
];

// Map the config SOCIAL_LINKS (array of {label, href}) into the keyed shape the
// ShopSettings contract uses, looking up each label case-insensitively.
function socialHref(label: string): string {
  const found = SOCIAL_LINKS.find(
    (l) => l.label.toLowerCase() === label.toLowerCase(),
  );
  return found ? found.href : "";
}

// Seed fallback for shop settings, cloned from the lib/config.ts constants so
// demo mode and the pre-migration build keep working. openingHours starts empty
// (no hours confirmed yet); the owner fills them in via /admin/settings.
export const SEED_SHOP_SETTINGS: ShopSettings = {
  whatsappNumber: WHATSAPP_NUMBER,
  addressLines: [...ADDRESS_LINES],
  mapsUrl: MAPS_URL,
  socialLinks: {
    instagram: socialHref("Instagram"),
    facebook: socialHref("Facebook"),
    tiktok: socialHref("TikTok"),
  },
  openingHours: [],
};
