import Link from "next/link";
import { getOrdersPage } from "@/lib/queries/orders";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { formatCop } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { DemoModeNotice } from "@/components/ui/DemoModeNotice";
import { ORDER_STATUSES, deliveryLabel } from "../../_lib/status";
import { formatDate } from "../../_lib/dates";
import { StatusBadge } from "../../_components/StatusBadge";
import { OrderStatusFilter } from "../../_components/OrderStatusFilter";

export const dynamic = "force-dynamic";

function isStatus(value: string | undefined): value is OrderStatus {
  return !!value && (ORDER_STATUSES as string[]).includes(value);
}

/** Build an /admin/orders href from the given params, dropping empty values. */
function ordersHref(params: {
  status?: OrderStatus;
  q?: string;
  page?: number;
}): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

// Build the formatter once at module scope; rebuilding it per call is costly.
const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status, q, page } = await searchParams;
  const active = isStatus(status) ? status : undefined;
  const term = q?.trim() ? q.trim() : undefined;
  const requestedPage = Math.max(1, Number.parseInt(page ?? "", 10) || 1);

  let {
    orders,
    total,
    page: currentPage,
    pageCount,
  } = await getOrdersPage({
    status: active,
    q: term,
    page: requestedPage,
  });

  // Clamp an out-of-range ?page (e.g. /admin/orders?page=999) to the last real
  // page and re-fetch, so the served rows match the displayed page indicator
  // and the prev/next links stay in range. getOrdersPage echoes back the
  // requested page un-clamped, so this guard lives here.
  const clampedPage = Math.min(requestedPage, Math.max(1, pageCount));
  if (clampedPage !== currentPage) {
    ({ orders, total, page: currentPage, pageCount } = await getOrdersPage({
      status: active,
      q: term,
      page: clampedPage,
    }));
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < pageCount;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Pedidos
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          {total} pedido{total === 1 ? "" : "s"}
          {active ? " con este estado" : ""}
          {term ? ` para "${term}"` : ""}.
        </p>
      </header>

      {!hasSupabaseEnv() && (
        <DemoModeNotice>
          Base de datos no configurada: los pedidos requieren conectar Supabase.
        </DemoModeNotice>
      )}

      <OrderStatusFilter active={active} q={term} />

      <form method="get" className="flex flex-wrap items-center gap-2">
        {active && <input type="hidden" name="status" value={active} />}
        <input
          type="search"
          name="q"
          defaultValue={term ?? ""}
          placeholder="Buscar por nombre, teléfono o código"
          aria-label="Buscar pedidos"
          className="min-w-0 flex-1 rounded-full border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] px-4 py-2 text-sm text-polar-text placeholder:text-polar-dim focus:border-[rgba(167,73,197,0.55)] focus:outline-none"
        />
        <button type="submit" className="btn-brand">
          Buscar
        </button>
        {term && (
          <Link href={ordersHref({ status: active })} className="btn-ghost">
            Limpiar
          </Link>
        )}
      </form>

      <div className="glass-card overflow-hidden">
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-polar-muted">
            No hay pedidos{" "}
            {term
              ? "para esta búsqueda"
              : active
                ? "con este estado"
                : "todavía"}
            .
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
                    {formatDate(order.createdAt, DATE_FORMAT)}
                  </p>
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

      {pageCount > 1 && (
        <nav
          aria-label="Paginación de pedidos"
          className="flex items-center justify-between gap-3"
        >
          {hasPrev ? (
            <Link
              href={ordersHref({
                status: active,
                q: term,
                page: currentPage - 1,
              })}
              className="btn-outline-rect"
            >
              Anterior
            </Link>
          ) : (
            <span className="btn-outline-rect pointer-events-none opacity-40">
              Anterior
            </span>
          )}

          <span className="text-sm text-polar-muted">
            Página {currentPage} de {pageCount}
          </span>

          {hasNext ? (
            <Link
              href={ordersHref({
                status: active,
                q: term,
                page: currentPage + 1,
              })}
              className="btn-outline-rect"
            >
              Siguiente
            </Link>
          ) : (
            <span className="btn-outline-rect pointer-events-none opacity-40">
              Siguiente
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
