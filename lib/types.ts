export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCop: number;
  accentColor: string;
  imageUrl: string | null;
  categorySlug: string;
  categoryName: string;
  sortOrder: number;
  isActive: boolean;
  soldOut: boolean;
  stockQty?: number | null; // null/undefined = untracked
}

// A "combo" is a curated bundle (e.g. drinks + a bottle) sold at a fixed price.
// It behaves like a Product at checkout (priced server-side, added to the cart,
// persisted in an order) but lives in its own `combos` table and renders in its
// own storefront section — it never appears in the menu product grid.
export interface Combo {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCop: number;
  accentColor: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  soldOut: boolean;
}

// A "Nuevo" promotional banner: a wide image + heading whose COMPRAR button adds
// the linked product to the cart (or follows `href` when no product is linked).
// `product` is resolved server-side so the client can add it without a round trip.
export interface PromoBanner {
  id: string;
  heading: string;
  imageUrl: string | null;
  href: string | null;
  sortOrder: number;
  isActive: boolean;
  product: Product | null;
}

// What a cart line points at: a catalog product or a combo. Both price
// server-side at checkout through their respective tables.
export type CartItemKind = "product" | "combo";

export interface CartItem {
  // The kind of catalog entity this line refers to. Older persisted carts (pre
  // combos) omit it; consumers default it to "product".
  kind: CartItemKind;
  // The product or combo id (depending on `kind`). Kept named `productId` for
  // backward compatibility with existing cart consumers.
  productId: string;
  name: string;
  unitPriceCop: number;
  accentColor: string;
  imageUrl: string | null;
  qty: number;
}

export type DeliveryType = "delivery" | "pickup";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivered"
  | "cancelled";

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  address?: string;
  deliveryType: DeliveryType;
  notes?: string;
  // Each line references exactly one of productId / comboId.
  items: { productId?: string; comboId?: string; qty: number }[];
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string | null;
  deliveryType: DeliveryType;
  notes: string | null;
  status: OrderStatus;
  totalCop: number;
  shortCode?: string | null; // human-friendly POL- order reference (DB only)
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  // One of productId / comboId is set; the other is null for that line. The
  // display name is always the `productName` snapshot taken at order time.
  productId: string | null;
  comboId?: string | null;
  productName: string;
  qty: number;
  unitPriceCop: number;
  lineTotalCop: number;
}

// Editable image slots backed by Supabase Storage (site_assets table). The
// stored value is always a public URL string (or a site-relative path in the
// seed fallback). Instagram slots also carry an optional outbound href.
export type AssetSlot =
  | "hero_desktop"
  | "hero_mobile"
  | "logo"
  | "og_image"
  | "instagram_1"
  | "instagram_2"
  | "instagram_3"
  | "instagram_4"
  | "instagram_5";

export interface SiteAsset {
  slot: AssetSlot;
  url: string;
  href: string | null;
  sortOrder: number;
}

// A single opening-hours row for the storefront, e.g.
//   { label: "Lun a Jue", value: "2:00 pm - 10:00 pm" }
export interface OpeningHour {
  label: string;
  value: string;
}

// Owner-editable shop settings (shop_settings table). Mirrors the static
// constants in lib/config.ts and is the source of truth in DB mode.
export interface ShopSettings {
  whatsappNumber: string;
  addressLines: string[];
  mapsUrl: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    tiktok: string;
  };
  openingHours: OpeningHour[];
}
