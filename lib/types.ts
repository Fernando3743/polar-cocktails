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

export interface CartItem {
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
  promoCode?: string; // the code the customer applied (re-validated server-side)
  items: { productId: string; qty: number }[];
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string | null;
  deliveryType: DeliveryType;
  notes: string | null;
  status: OrderStatus;
  promoCode: string | null;
  discountCop: number; // maps to orders.discount_total (DB default 0)
  totalCop: number; // subtotal - discount, clamped >= 0
  shortCode?: string | null; // human-friendly POL- order reference (DB only)
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitPriceCop: number;
  lineTotalCop: number;
}

export type PromoType = "percent" | "fixed";

// Result of validating a code (shared by RPC + demo path + checkout UI).
export interface PromoValidation {
  valid: boolean;
  type: PromoType | null;
  value: number | null;
  discountCop: number; // computed discount for the given subtotal
  reason: string | null; // Spanish error message when invalid
}

// Admin manager shape.
export interface AdminPromo {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  minSubtotalCop: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
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
