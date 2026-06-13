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
