import Link from "next/link";
import { getOrders } from "@/lib/queries/orders";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { formatCop } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUSES, deliveryLabel } from "../../_lib/status";
import { StatusBadge } from "../../_components/StatusBadge";
import { OrderStatusFilter } from "../../_components/OrderStatusFilter";

export const dynamic = "force-dynamic";

function isStatus(value: string | undefined): value is OrderStatus {
  return !!value && (ORDER_STATUSES as string[]).includes(value);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = isStatus(status) ? status : undefined;

  const orders = await getOrders(active);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Pedidos
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          {orders.length} pedido{orders.length === 1 ? "" : "s"}
          {active ? " con este estado" : ""}.
        </p>
      </header>

      {!hasSupabaseEnv() && (
        <p className="rounded-xl border border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.08)] px-4 py-3 text-sm text-[#e0c08a]">
          Base de datos no configurada: los pedidos requieren conectar Supabase.
        </p>
      )}

      <OrderStatusFilter active={active} />

      <div className="glass-card overflow-hidden">
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-polar-muted">
            No hay pedidos {active ? "con este estado" : "todavía"}.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-600 text-polar-text">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-polar-dim">
                      {order.shortCode ? `${order.shortCode} · ` : ""}
                      {order.customerPhone} · {deliveryLabel(order.deliveryType)}
                    </p>
                  </div>
                  <p className="hidden text-xs text-polar-dim sm:block">
                    {formatDate(order.createdAt)}
                  </p>
                  {order.promoCode && (
                    <span className="rounded-full border border-[rgba(146,40,218,0.35)] bg-[rgba(146,40,218,0.1)] px-2 py-0.5 text-[11px] font-600 text-polar-magenta">
                      {order.promoCode}
                    </span>
                  )}
                  <span className="text-sm font-700 text-polar-text">
                    {formatCop(order.totalCop)}
                  </span>
                  <StatusBadge status={order.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
