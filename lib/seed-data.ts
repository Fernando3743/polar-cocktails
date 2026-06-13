import {
  ADDRESS_LINES,
  MAPS_URL,
  SOCIAL_LINKS,
  WHATSAPP_NUMBER,
} from "@/lib/config";
import { formatCop } from "@/lib/format";
import type {
  Category,
  Product,
  PromoType,
  PromoValidation,
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
    imageUrl: "/images/polar-cocktail-product-transparent-trimmed.png",
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
    imageUrl: "/images/polar-cocktail-purple-transparent-trimmed.png",
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
    imageUrl: "/images/polar-cocktail-golden-transparent-trimmed.png",
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
    imageUrl: "/images/polar-cocktail-red-transparent-trimmed.png",
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
    imageUrl: "/images/polar-cocktail-mango-transparent-trimmed.png",
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
    imageUrl: "/images/polar-cocktail-mint-cookie-transparent-trimmed.png",
    categorySlug: "especiales",
    categoryName: "Especiales",
    sortOrder: 6,
    isActive: true,
    soldOut: false,
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
  { slot: "logo", url: "/images/polar-logo.jpg", href: "", sortOrder: 2 },
  { slot: "og_image", url: "/opengraph-image.png", href: "", sortOrder: 3 },
  {
    slot: "instagram_1",
    url: "/images/instagram-prototype-1.png",
    href: "",
    sortOrder: 4,
  },
  {
    slot: "instagram_2",
    url: "/images/instagram-prototype-2.png",
    href: "",
    sortOrder: 5,
  },
  {
    slot: "instagram_3",
    url: "/images/instagram-prototype-3.png",
    href: "",
    sortOrder: 6,
  },
  {
    slot: "instagram_4",
    url: "/images/instagram-prototype-4.png",
    href: "",
    sortOrder: 7,
  },
  {
    slot: "instagram_5",
    url: "/images/instagram-prototype-5.png",
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

interface SeedPromo {
  code: string;
  type: PromoType;
  value: number;
  minSubtotalCop: number | null;
  active: boolean;
}

export const SEED_PROMOS: SeedPromo[] = [
  { code: "POLAR10", type: "percent", value: 10, minSubtotalCop: null, active: true },
  { code: "FRIO5000", type: "fixed", value: 5000, minSubtotalCop: 30000, active: true },
];

// ACT-5: this demo-mode validator intentionally checks only code match,
// active flag, and minSubtotalCop. SeedPromo has no startsAt/endsAt or
// maxRedemptions, so there is NO time-window or redemption-cap enforcement
// here. The DB path (validate_promo / create_order RPC) is the source of truth
// for those rules; demo promos are unrestricted by design.
export function validateSeedPromo(
  code: string,
  subtotalCop: number,
): PromoValidation {
  const normalized = code.trim().toUpperCase();
  const promo = SEED_PROMOS.find((p) => p.code === normalized);
  if (!promo || !promo.active) {
    return {
      valid: false,
      type: null,
      value: null,
      discountCop: 0,
      reason: "Código no válido.",
    };
  }
  if (promo.minSubtotalCop !== null && subtotalCop < promo.minSubtotalCop) {
    return {
      valid: false,
      type: null,
      value: null,
      discountCop: 0,
      reason: `Aplica desde ${formatCop(promo.minSubtotalCop)}.`,
    };
  }
  const raw =
    promo.type === "percent"
      ? Math.floor((subtotalCop * promo.value) / 100)
      : promo.value;
  const discountCop = Math.min(Math.max(raw, 0), subtotalCop); // clamp 0..subtotal
  return {
    valid: true,
    type: promo.type,
    value: promo.value,
    discountCop,
    reason: null,
  };
}
