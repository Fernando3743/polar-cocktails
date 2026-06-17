import type { DeliveryType } from "@/lib/types";

/** Spanish label per delivery type. Shared by the WhatsApp message builder and
 *  the admin order views so the two never drift. */
export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  delivery: "Domicilio",
  pickup: "Recoger en tienda",
};

/** Spanish label for a delivery type. */
export function deliveryLabel(type: DeliveryType): string {
  return DELIVERY_LABELS[type];
}
