import { formatCop } from "@/lib/format";
import { whatsappUrl } from "@/lib/config";
import type { DeliveryType } from "@/lib/types";

export interface WhatsAppOrderLine {
  name: string;
  qty: number;
  unitPriceCop: number; // integer COP, server-trusted in DB mode
}

export interface WhatsAppOrderSummary {
  orderRef: string; // short code if present, else the uuid
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address?: string | null; // only meaningful for delivery
  notes?: string | null;
  lines: WhatsAppOrderLine[];
  totalCop: number; // server-computed total (already discounted)
  promoCode?: string | null; // applied promo code, if any
  discountCop?: number | null; // discount applied to the total, if any
}

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  delivery: "Domicilio",
  pickup: "Recoger en tienda",
};

// Builds the Spanish WhatsApp body. No emojis; ASCII identifiers only.
export function buildWhatsAppMessage(o: WhatsAppOrderSummary): string {
  const lines: string[] = [];
  lines.push("Hola Polar, quiero confirmar mi pedido.");
  lines.push("");
  lines.push(`Pedido: ${o.orderRef}`);
  lines.push(`Cliente: ${o.customerName}`);
  lines.push(`Telefono: ${o.customerPhone}`);
  lines.push(`Entrega: ${DELIVERY_LABEL[o.deliveryType]}`);
  if (o.deliveryType === "delivery" && o.address) {
    lines.push(`Direccion: ${o.address}`);
  }
  lines.push("");
  lines.push("Productos:");
  for (const l of o.lines) {
    lines.push(`- ${l.name} x ${l.qty} = ${formatCop(l.unitPriceCop * l.qty)}`);
  }
  lines.push("");
  if (o.promoCode && o.discountCop && o.discountCop > 0) {
    lines.push(`Codigo: ${o.promoCode}`);
    lines.push(`Descuento: -${formatCop(o.discountCop)}`);
  }
  lines.push(`Total: ${formatCop(o.totalCop)}`);
  if (o.notes && o.notes.trim()) {
    lines.push("");
    lines.push(`Notas: ${o.notes.trim()}`);
  }
  lines.push("");
  lines.push("Pago contra entrega (efectivo o transferencia).");
  return lines.join("\n");
}

// Convenience: full wa.me link via the existing config helper.
export function buildWhatsAppLink(o: WhatsAppOrderSummary): string {
  return whatsappUrl(buildWhatsAppMessage(o));
}
