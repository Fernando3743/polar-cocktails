import { formatCop } from "@/lib/format";
import { whatsappUrl } from "@/lib/config";
import { DELIVERY_LABELS } from "@/lib/labels";
import type { DeliveryType } from "@/lib/types";
import type { OrderSummary } from "@/lib/actions/orders";

export interface WhatsAppOrderLine {
  name: string;
  qty: number;
  unitPriceCop: number; // integer COP, server-trusted in DB mode
  lineTotalCop: number; // integer COP, server-trusted
}

export interface WhatsAppOrderSummary {
  orderRef: string; // short code if present, else the uuid
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address?: string | null; // only meaningful for delivery
  notes?: string | null;
  lines: WhatsAppOrderLine[];
  subtotalCop: number; // server-computed subtotal
  totalCop: number; // server-computed total
}

// Customer-entered contact / delivery fields. These are not part of the
// server-trusted financial OrderSummary (which only carries items + amounts),
// so they are supplied alongside it from the checkout form.
export interface WhatsAppContact {
  orderRef: string; // short code when present, else the route id
  customerName: string;
  customerPhone: string; // already normalized by the order schema
  deliveryType: DeliveryType;
  address?: string | null;
  notes?: string | null;
}

/**
 * Combines the server-trusted financial summary (items, unit prices, subtotal,
 * total) with the customer-entered contact/delivery details into the WhatsApp
 * message payload. Line items and every amount come from `summary` — never from
 * cart state.
 */
export function whatsappSummaryFromOrder(
  summary: OrderSummary,
  contact: WhatsAppContact,
): WhatsAppOrderSummary {
  return {
    orderRef: contact.orderRef,
    customerName: contact.customerName,
    customerPhone: contact.customerPhone,
    deliveryType: contact.deliveryType,
    address: contact.address ?? null,
    notes: contact.notes ?? null,
    lines: summary.items.map((it) => ({
      name: it.productName,
      qty: it.qty,
      unitPriceCop: it.unitPriceCop,
      lineTotalCop: it.lineTotalCop,
    })),
    subtotalCop: summary.subtotalCop,
    totalCop: summary.totalCop,
  };
}

// Collapse newlines/control chars to a single space and cap length so a crafted
// customerName/address/notes value cannot inject extra lines into the message or
// blow up its size. Pairs with the Zod .max bounds on the order schema.
function sanitizeField(value: string, max: number): string {
  return value
    .replace(/[\r\n]+/g, " ")
    // Strip remaining C0 control characters and DEL (tabs, etc.) that could
    // distort the message layout.
    .replace(/\p{Cc}+/gu, " ")
    .trim()
    .slice(0, max);
}

// Builds the Spanish WhatsApp body. No emojis; ASCII identifiers only.
function buildWhatsAppMessage(o: WhatsAppOrderSummary): string {
  const lines: string[] = [];
  lines.push("Hola Polar, quiero confirmar mi pedido.");
  lines.push("");
  lines.push(`Pedido: ${o.orderRef}`);
  lines.push(`Cliente: ${sanitizeField(o.customerName, 80)}`);
  lines.push(`Telefono: ${o.customerPhone}`);
  lines.push(`Entrega: ${DELIVERY_LABELS[o.deliveryType]}`);
  if (o.deliveryType === "delivery" && o.address) {
    lines.push(`Direccion: ${sanitizeField(o.address, 200)}`);
  }
  lines.push("");
  lines.push("Productos:");
  for (const l of o.lines) {
    // Use the server-trusted per-line total, not unitPrice * qty from the client.
    lines.push(
      `- ${sanitizeField(l.name, 120)} x ${l.qty} = ${formatCop(l.lineTotalCop)}`,
    );
  }
  lines.push("");
  lines.push(`Total: ${formatCop(o.totalCop)}`);
  const notes = o.notes ? sanitizeField(o.notes, 500) : "";
  if (notes) {
    lines.push("");
    lines.push(`Notas: ${notes}`);
  }
  lines.push("");
  lines.push("Pago contra entrega (efectivo o transferencia).");
  return lines.join("\n");
}

// Convenience: full wa.me link via the existing config helper. `whatsappNumber`
// is the shop's configured number (from settings); omit it and the helper falls
// back to the config default.
export function buildWhatsAppLink(
  o: WhatsAppOrderSummary,
  whatsappNumber?: string,
): string {
  return whatsappUrl(buildWhatsAppMessage(o), whatsappNumber);
}
