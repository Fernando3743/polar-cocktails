import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/queries/orders";
import { formatCop } from "@/lib/format";
import { whatsappUrl } from "@/lib/config";
import { WhatsAppIcon, MapPinIcon } from "@/components/icons";
import { deliveryLabel } from "../../../_lib/status";
import { StatusBadge } from "../../../_components/StatusBadge";
import { OrderStatusControl } from "../../../_components/OrderStatusControl";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const items = order.items ?? [];
  const itemsTotal = items.reduce((sum, i) => sum + i.lineTotalCop, 0);

  const waMessage = `Hola ${order.customerName}, sobre tu pedido en Polar (#${order.id}).`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/orders"
          className="text-sm text-polar-muted transition-colors hover:text-polar-text"
        >
          ← Pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-700 text-polar-text">
            {order.customerName}
          </h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-sm text-polar-dim">
          Pedido #{order.id} · {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Items */}
        <div className="glass-card overflow-hidden">
          <h2 className="border-b border-[rgba(167,73,197,0.12)] px-5 py-4 font-display text-lg font-600 text-polar-text">
            Productos
          </h2>
          {items.length === 0 ? (
            <p className="px-5 py-6 text-sm text-polar-muted">
              No hay líneas de pedido disponibles.
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-600 text-polar-text">
                      {item.productName}
                    </p>
                    <p className="text-xs text-polar-dim">
                      {item.qty} × {formatCop(item.unitPriceCop)}
                    </p>
                  </div>
                  <span className="text-sm font-700 text-polar-text">
                    {formatCop(item.lineTotalCop)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t border-[rgba(167,73,197,0.12)] px-5 py-4">
            <span className="text-sm text-polar-muted">Total</span>
            <span className="font-display text-xl font-700 text-polar-text">
              {formatCop(order.totalCop)}
            </span>
          </div>
          {items.length > 0 && itemsTotal !== order.totalCop && (
            <p className="px-5 pb-4 text-xs text-[#e0c08a]">
              Aviso: la suma de las líneas ({formatCop(itemsTotal)}) difiere del
              total guardado.
            </p>
          )}
        </div>

        {/* Customer + status */}
        <div className="flex flex-col gap-6">
          <div className="glass-card flex flex-col gap-4 p-5">
            <OrderStatusControl orderId={order.id} current={order.status} />
          </div>

          <div className="glass-card flex flex-col gap-4 p-5">
            <h2 className="font-display text-lg font-600 text-polar-text">
              Cliente
            </h2>
            <dl className="flex flex-col gap-3 text-sm">
              <Detail label="Teléfono" value={order.customerPhone} />
              <Detail label="Entrega" value={deliveryLabel(order.deliveryType)} />
              {order.address && <Detail label="Dirección" value={order.address} />}
              {order.notes && <Detail label="Notas" value={order.notes} />}
            </dl>

            <div className="flex flex-col gap-3 border-t border-[rgba(167,73,197,0.12)] pt-4">
              <a
                href={whatsappUrl(waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand h-11 text-sm"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Escribir por WhatsApp
              </a>
              {order.deliveryType === "delivery" && order.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost h-11 text-sm"
                >
                  <MapPinIcon className="h-[18px] w-[18px]" />
                  Ver dirección en mapa
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-[0.12em] text-polar-dim">
        {label}
      </dt>
      <dd className="text-polar-text">{value}</dd>
    </div>
  );
}
