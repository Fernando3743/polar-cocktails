import type { OrderStatus } from "@/lib/types";

/** Spanish labels for each order status (staff-facing). */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** All statuses in workflow order, for filters and selects. */
export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "delivered",
  "cancelled",
];

/**
 * Tailwind utility classes for a status badge (border + tinted bg + text).
 * Kept utilitarian but tinted to read at a glance against the dark theme.
 */
export const STATUS_BADGE: Record<OrderStatus, string> = {
  pending:
    "border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.12)] text-[#e0c08a]",
  confirmed:
    "border-[rgba(125,211,252,0.4)] bg-[rgba(125,211,252,0.1)] text-[#9bd9f8]",
  preparing:
    "border-[rgba(167,73,197,0.45)] bg-[rgba(146,40,218,0.14)] text-[#c79bdf]",
  delivered:
    "border-[rgba(63,181,138,0.45)] bg-[rgba(63,181,138,0.12)] text-[#7fd0b3]",
  cancelled:
    "border-[rgba(226,69,122,0.45)] bg-[rgba(226,69,122,0.1)] text-[#f3a9c1]",
};

/** Spanish label for a delivery type. */
export function deliveryLabel(type: "delivery" | "pickup"): string {
  return type === "delivery" ? "Domicilio" : "Recoger en tienda";
}
