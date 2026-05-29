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
  totalCop: number;
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
