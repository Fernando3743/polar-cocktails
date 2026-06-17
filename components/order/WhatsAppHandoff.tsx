"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { WhatsAppOrderSummary } from "@/lib/whatsapp";

const SS_KEY = "polar_last_order:v1"; // sessionStorage key (matches CheckoutForm)

// Runtime guards for the JSON read back from sessionStorage. The stored payload
// is server-trusted when the checkout form writes it, but sessionStorage is
// attacker-writable, so the shape is validated before it is trusted to build the
// message (an unchecked cast can crash the confirmation render).
function isOrderLine(v: unknown): v is WhatsAppOrderSummary["lines"][number] {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.name === "string" &&
    typeof l.qty === "number" &&
    Number.isFinite(l.qty) &&
    typeof l.unitPriceCop === "number" &&
    Number.isFinite(l.unitPriceCop) &&
    typeof l.lineTotalCop === "number" &&
    Number.isFinite(l.lineTotalCop)
  );
}

function isOrderSummary(v: unknown): v is WhatsAppOrderSummary {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.orderRef === "string" &&
    typeof s.customerName === "string" &&
    typeof s.customerPhone === "string" &&
    (s.deliveryType === "delivery" || s.deliveryType === "pickup") &&
    (s.address == null || typeof s.address === "string") &&
    (s.notes == null || typeof s.notes === "string") &&
    Array.isArray(s.lines) &&
    s.lines.every(isOrderLine) &&
    typeof s.subtotalCop === "number" &&
    Number.isFinite(s.subtotalCop) &&
    typeof s.totalCop === "number" &&
    Number.isFinite(s.totalCop)
  );
}

export function WhatsAppHandoff({
  orderId,
  serverSummary,
  whatsappNumber,
}: {
  orderId: string;
  // Server-trusted summary when available SSR-side (e.g. an authenticated
  // admin viewing the order). Null for anonymous customers — they get the
  // summary from sessionStorage after mount.
  serverSummary: WhatsAppOrderSummary | null;
  // Shop WhatsApp number from settings, threaded down from the server page.
  // Used for the generic fallback link; falls back to the config default.
  whatsappNumber?: string;
}) {
  // The authoritative summary, once known. Seeded from serverSummary (admin
  // SSR) and upgraded from sessionStorage on mount for the customer view.
  const [summary, setSummary] = useState<WhatsAppOrderSummary | null>(
    serverSummary,
  );

  useEffect(() => {
    // sessionStorage is the reliable carrier (demo + customer-facing DB) and
    // holds the server-trusted summary persisted by the checkout form.
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return;
      const stored: unknown = JSON.parse(raw);
      if (
        typeof stored === "object" &&
        stored !== null &&
        (stored as { orderId?: unknown }).orderId === orderId &&
        isOrderSummary((stored as { summary?: unknown }).summary)
      ) {
        // Deliberate read-from-external-system-on-mount, not derived state. The
        // shape is validated above so a malformed/tampered value falls through
        // to the generic link instead of crashing the render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSummary((stored as { summary: WhatsAppOrderSummary }).summary);
      }
    } catch {
      // ignore; keep serverSummary (or null -> generic link)
    }
  }, [orderId]);

  // Link: detailed message from the server summary, else a generic safe link.
  // Both paths use the shop's configured number (threaded from settings); the
  // helper falls back to the config default when it is undefined.
  const href = summary
    ? buildWhatsAppLink(summary, whatsappNumber)
    : whatsappUrl(
        `Hola Polar, quiero confirmar mi pedido. Pedido: ${orderId}.`,
        whatsappNumber,
      );

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-brand w-full sm:w-auto"
      >
        <WhatsAppIcon className="h-[18px] w-[18px]" />
        Enviar pedido por WhatsApp
      </a>
      <Link href="/menu" className="btn-ghost w-full sm:w-auto">
        Seguir comprando
      </Link>
    </div>
  );
}
