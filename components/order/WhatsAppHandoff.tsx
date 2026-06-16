"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { WhatsAppOrderSummary } from "@/lib/whatsapp";

const SS_KEY = "polar_last_order:v1"; // sessionStorage key (matches CheckoutForm)

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
      const stored = JSON.parse(raw) as {
        orderId: string;
        summary: WhatsAppOrderSummary;
      };
      if (stored?.orderId === orderId && stored.summary) {
        // Deliberate read-from-external-system-on-mount, not derived state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSummary(stored.summary);
      }
    } catch {
      // ignore; keep serverSummary (or null -> generic link)
    }
  }, [orderId]);

  // Link: detailed message from the server summary, else a generic safe link.
  const href = summary
    ? buildWhatsAppLink(summary)
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
