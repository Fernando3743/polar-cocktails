import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SnowflakeIcon } from "@/components/icons";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getOrderById, getOrderByShortCode } from "@/lib/queries/orders";
import { getShopSettings } from "@/lib/queries/site";
import { WhatsAppHandoff } from "@/components/order/WhatsAppHandoff";
import type { WhatsAppOrderSummary } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pedido confirmado",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Shop WhatsApp number for the handoff link. Falls back to SEED_SHOP_SETTINGS
  // in demo mode / before migration 0007, so this page stays dynamic but never
  // requires a DB (consistent with Navbar/InfoRow/MobileBottomNav). Kicked off
  // up front (not awaited yet) so it runs in parallel with the optional
  // authenticated order lookup below — the two reads are independent.
  const settingsPromise = getShopSettings();

  // Reference shown on the "Número de pedido" card: short code when available,
  // otherwise the id from the route.
  let orderRef = id;
  let serverSummary: WhatsAppOrderSummary | null = null;

  if (hasSupabaseEnv()) {
    // Optional authenticated read path (e.g. an admin opening the confirmation
    // URL). The customer view does NOT depend on this: orders has no public
    // SELECT under RLS, so anon reads return null and the customer summary
    // comes from sessionStorage instead. Only spend the query when there is a
    // validated user (getUser, not getSession).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const order = id.startsWith("POL-")
        ? await getOrderByShortCode(id)
        : await getOrderById(id);
      if (order) {
        orderRef = order.shortCode ?? order.id;
        if (order.items) {
          serverSummary = {
            orderRef,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            deliveryType: order.deliveryType,
            address: order.address,
            notes: order.notes,
            lines: order.items.map((it) => ({
              name: it.productName,
              qty: it.qty,
              unitPriceCop: it.unitPriceCop,
              lineTotalCop: it.lineTotalCop,
            })),
            subtotalCop: order.items.reduce(
              (sum, it) => sum + it.lineTotalCop,
              0,
            ),
            totalCop: order.totalCop,
          };
        }
      }
    }
  }

  const settings = await settingsPromise;

  return (
    <div className="py-16 sm:py-24">
      <Container>
        <div className="glass-card mx-auto flex max-w-[560px] flex-col items-center gap-6 px-6 py-12 text-center sm:px-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(146,40,218,0.18)] text-polar-snow shadow-[0_0_40px_rgba(178,49,202,0.35)]">
            <SnowflakeIcon className="h-8 w-8" />
          </span>

          <div className="flex flex-col gap-2">
            <p className="eyebrow">Pedido recibido</p>
            <h1 className="font-display text-3xl font-700 text-polar-text sm:text-4xl">
              ¡Gracias por tu <span className="text-polar-magenta">pedido</span>!
            </h1>
          </div>

          <p className="max-w-[420px] text-base leading-relaxed text-polar-muted">
            Hemos recibido tu pedido y lo estamos preparando. Te contactaremos
            por WhatsApp para confirmar los detalles de entrega.
          </p>

          <div className="w-full rounded-2xl border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.3)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.14em] text-polar-dim">
              Número de pedido
            </p>
            <p className="mt-1 break-all font-display text-lg font-600 text-polar-text">
              {orderRef}
            </p>
          </div>

          <WhatsAppHandoff
            orderId={id}
            serverSummary={serverSummary}
            whatsappNumber={settings.whatsappNumber}
          />

          <Link
            href="/"
            className="text-sm text-polar-muted transition-colors hover:text-polar-text"
          >
            Volver al inicio
          </Link>
        </div>
      </Container>
    </div>
  );
}
