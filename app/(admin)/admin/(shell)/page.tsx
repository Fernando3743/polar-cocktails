import Link from "next/link";
import { getOrders } from "@/lib/queries/orders";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { formatCop } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { getAdminProducts } from "../_lib/queries";
import { ORDER_STATUSES, deliveryLabel } from "../_lib/status";
import { StatusBadge } from "../_components/StatusBadge";

export const dynamic = "force-dynamic";

// Build the formatter once at module scope; rebuilding it per call is costly.
const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return DATE_FORMAT.format(date);
}

export default async function AdminDashboardPage() {
  const [products, orders] = await Promise.all([
    getAdminProducts(),
    getOrders(),
  ]);

  const activeProducts = products.filter((p) => p.isActive).length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const delivered = orders.filter((o) => o.status === "delivered");
  const revenue = delivered.reduce((sum, o) => sum + o.totalCop, 0);

  // force-dynamic page: read request-time wall clock via `new Date()` (mirrors
  // components/seo/JsonLd.tsx) so the rolling 30-day window is recomputed per request.
  const since = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
  const revenueLast30 = delivered.reduce((sum, o) => {
    const created = new Date(o.createdAt).getTime();
    return Number.isNaN(created) || created < since ? sum : sum + o.totalCop;
  }, 0);

  const countsByStatus = ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));

  const recent = orders.slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Resumen
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          Estado general del catálogo y los pedidos.
        </p>
      </header>

      {!hasSupabaseEnv() && (
        <p className="rounded-xl border border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.08)] px-4 py-3 text-sm text-[#e0c08a]">
          Base de datos no configurada: mostrando catálogo de demostración. Los
          pedidos requieren conectar Supabase.
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Productos" value={String(products.length)} />
        <StatCard label="Productos activos" value={String(activeProducts)} />
        <StatCard label="Pedidos" value={String(orders.length)} />
        <StatCard label="Pendientes" value={String(pendingOrders)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[rgba(167,73,197,0.12)] px-5 py-4">
            <h2 className="font-display text-lg font-600 text-polar-text">
              Pedidos recientes
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm text-polar-magenta transition-colors hover:text-polar-purple-light"
            >
              Ver todos
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="px-5 py-8 text-sm text-polar-muted">
              Aún no hay pedidos.
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
              {recent.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-4 font-display text-lg font-600 text-polar-text">
            Por estado
          </h2>
          <ul className="flex flex-col gap-3">
            {countsByStatus.map(({ status, count }) => (
              <li
                key={status}
                className="flex items-center justify-between"
              >
                <StatusBadge status={status as OrderStatus} />
                <span className="font-display text-lg font-700 text-polar-text">
                  {count}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-[rgba(167,73,197,0.12)] pt-4">
            <p className="text-xs uppercase tracking-[0.14em] text-polar-dim">
              Ingresos totales (entregados)
            </p>
            <p className="mt-1 font-display text-xl font-700 text-polar-text">
              {formatCop(revenue)}
            </p>
          </div>

          <div className="mt-4 border-t border-[rgba(167,73,197,0.12)] pt-4">
            <p className="text-xs uppercase tracking-[0.14em] text-polar-dim">
              Ingresos últimos 30 días (entregados)
            </p>
            <p className="mt-1 font-display text-xl font-700 text-polar-text">
              {formatCop(revenueLast30)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-polar-dim">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-700 text-polar-text">
        {value}
      </p>
    </div>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  return (
    <li>
      <Link
        href={`/admin/orders/${order.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-600 text-polar-text">
            {order.customerName}
          </p>
          <p className="text-xs text-polar-dim">
            {deliveryLabel(order.deliveryType)} · {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-700 text-polar-text">
            {formatCop(order.totalCop)}
          </span>
          <StatusBadge status={order.status} />
        </div>
      </Link>
    </li>
  );
}
