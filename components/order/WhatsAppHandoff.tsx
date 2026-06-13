"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { WhatsAppOrderSummary } from "@/lib/whatsapp";

const SS_KEY = "polar_last_order"; // sessionStorage key (matches CheckoutForm)

export function WhatsAppHandoff({
  orderId,
  serverSummary,
}: {
  orderId: string;
  serverSummary: WhatsAppOrderSummary | null;
}) {
  // Generic safe fallback so the link is never broken/empty.
  const [href, setHref] = useState<string>(() =>
    serverSummary
      ? buildWhatsAppLink(serverSummary)
      : whatsappUrl(
          `Hola Polar, quiero confirmar mi pedido. Pedido: ${orderId}.`,
        ),
  );

  useEffect(() => {
    // sessionStorage is the reliable carrier (demo + customer-facing DB).
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as {
        orderId: string;
        summary: WhatsAppOrderSummary;
      };
      if (stored?.orderId === orderId && stored.summary) {
        // One-time upgrade from the SSR-safe generic href to the detailed
        // message once sessionStorage (a client-only API) is readable. This is
        // a deliberate read-from-external-system-on-mount, not derived state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHref(buildWhatsAppLink(stored.summary));
      }
    } catch {
      // ignore; keep generic / serverSummary fallback
    }
  }, [orderId]);

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
