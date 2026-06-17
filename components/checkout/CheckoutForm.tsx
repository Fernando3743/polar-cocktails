"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { useCart } from "@/components/cart/CartProvider";
import { createOrder } from "@/lib/actions/orders";
import { orderSchema } from "@/lib/validation/schemas";
import { formatCop } from "@/lib/format";
import { buildWhatsAppLink, whatsappSummaryFromOrder } from "@/lib/whatsapp";
import { PlusIcon } from "@/components/icons";
import { ProductThumb } from "@/components/menu/ProductThumb";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import type { DeliveryType, OrderInput } from "@/lib/types";

type FieldErrors = Partial<
  Record<
    "customerName" | "customerPhone" | "address" | "deliveryType" | "notes" | "items",
    string
  >
>;

export function CheckoutForm() {
  const router = useRouter();
  const { items, setQty, removeItem, subtotalCop, clear, mounted } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEmpty = mounted && items.length === 0;
  const totalCop = subtotalCop;

  const orderItems = useMemo(
    () => items.map((i) => ({ productId: i.productId, qty: i.qty })),
    [items],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const input: OrderInput = {
      customerName,
      customerPhone,
      deliveryType,
      address: deliveryType === "delivery" ? address : undefined,
      notes: notes.trim() ? notes : undefined,
      items: orderItems,
    };

    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors | undefined;
        if (key && !next[key]) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      if (next.items) {
        setFormError(next.items);
      }
      return;
    }

    setSubmitting(true);
    // Reserve the user-initiated popup before awaiting the server action.
    // Otherwise browsers may block the WhatsApp handoff after the async order
    // creation finishes.
    const whatsappWindow = window.open("", "_blank");
    try {
      const result = await createOrder(parsed.data);
      if (result.ok) {
        // Carry the order to the confirmation page (the reliable path in both
        // modes: demo orders aren't persisted, and RLS blocks the customer from
        // reading a DB order). The summary is the SERVER-trusted one returned by
        // createOrder / the create_order RPC — line items, subtotal, and total
        // are all server-computed here, never cart values. Contact /
        // delivery fields come from the normalized parsed input so the displayed
        // and WhatsApp phone match what is persisted.
        const summary = whatsappSummaryFromOrder(result.summary, {
          orderRef: result.summary.shortCode ?? result.orderId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          deliveryType: parsed.data.deliveryType,
          address:
            parsed.data.deliveryType === "delivery"
              ? (parsed.data.address ?? null)
              : null,
          notes: parsed.data.notes ?? null,
        });
        const payload = {
          orderId: result.orderId,
          summary,
        };
        try {
          sessionStorage.setItem("polar_last_order:v1", JSON.stringify(payload));
        } catch {
          // private mode / quota: confirmation page falls back to the generic link
        }
        const whatsappHref = buildWhatsAppLink(summary);
        if (whatsappWindow) {
          whatsappWindow.opener = null;
          whatsappWindow.location.href = whatsappHref;
        } else {
          window.open(whatsappHref, "_blank", "noopener,noreferrer");
        }
        clear();
        router.push(`/order/${result.orderId}`);
      } else {
        whatsappWindow?.close();
        setFormError(result.error);
        setSubmitting(false);
      }
    } catch {
      whatsappWindow?.close();
      setFormError("No pudimos procesar tu pedido. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  if (mounted && isEmpty) {
    return (
      <div className="mx-auto flex max-w-[620px] flex-col items-center gap-5 rounded-[28px] border border-[rgba(177,93,255,0.22)] bg-[rgba(10,9,24,0.72)] px-6 py-14 text-center shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
        <p className="font-display text-2xl font-600 text-polar-text">
          Tu carrito está vacío
        </p>
        <p className="max-w-[380px] text-sm leading-relaxed text-polar-muted">
          Agrega algunos granizados antes de pasar a pagar.
        </p>
        <Link href="/menu" className="btn-brand h-12 px-7 text-sm">
          Ver el menú
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="order-2 lg:order-1">
        <div className="rounded-[28px] border border-[rgba(177,93,255,0.22)] bg-[linear-gradient(150deg,rgba(13,15,34,0.92),rgba(15,6,42,0.78))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:p-7">
          <div className="flex flex-col gap-2 border-b border-[rgba(177,93,255,0.15)] pb-5">
            <p className="text-xs font-700 uppercase tracking-[0.22em] text-polar-purple-light">
              Entrega y contacto
            </p>
            <h2 className="font-display text-2xl font-700 text-polar-text">
              ¿A dónde llevamos la frescura?
            </h2>
            <p className="max-w-[560px] text-sm leading-relaxed text-polar-muted">
              Usamos estos datos solo para confirmar disponibilidad, entrega y
              forma de pago por WhatsApp.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-6">
          {/* Delivery type */}
          <fieldset>
            <legend className="mb-3 text-sm font-600 text-polar-text">
              ¿Cómo quieres recibir tu pedido?
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: "delivery", label: "Domicilio" },
                  { value: "pickup", label: "Recoger" },
                ] as const
              ).map((opt) => {
                const active = deliveryType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDeliveryType(opt.value)}
                    className={clsx(
                      "flex min-h-[76px] flex-col items-start justify-center rounded-2xl border px-4 text-left transition-colors",
                      active
                        ? "border-transparent bg-[linear-gradient(105deg,#a749c5,#9128da)] text-white shadow-[0_12px_30px_rgba(146,40,218,0.35)]"
                        : "border-[rgba(167,73,197,0.24)] bg-[rgba(8,10,28,0.72)] text-polar-muted2 hover:border-[rgba(167,73,197,0.48)]",
                    )}
                  >
                    <span className="text-sm font-700">{opt.label}</span>
                    <span className="mt-1 text-xs opacity-80">
                      {opt.value === "delivery"
                        ? "Lo llevamos a tu dirección"
                        : "Lo separas y pasas por tu pedido"}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="customerName"
              label="Nombre"
              error={errors.customerName}
            >
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="name"
                placeholder="Tu nombre"
                className={clsx("input-polar", errors.customerName && "input-error")}
              />
            </Field>

            <Field
              id="customerPhone"
              label="Teléfono / WhatsApp"
              error={errors.customerPhone}
            >
              <input
                id="customerPhone"
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                autoComplete="tel"
                placeholder="3001234567"
                className={clsx("input-polar", errors.customerPhone && "input-error")}
              />
            </Field>
          </div>

          {deliveryType === "delivery" && (
            <Field id="address" label="Dirección de entrega" error={errors.address}>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="Calle 41a # 26-81, barrio..."
                className={clsx("input-polar", errors.address && "input-error")}
              />
            </Field>
          )}

          <Field id="notes" label="Notas (opcional)" error={errors.notes}>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Sin azúcar, dejar en portería, etc."
              className={clsx("input-polar", "min-h-[88px] resize-y py-3")}
            />
          </Field>

          {formError && <Alert tone="error">{formError}</Alert>}

          <button
            type="submit"
            disabled={submitting || isEmpty}
            className="btn-brand h-[52px] w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Procesando..." : "Confirmar pedido"}
          </button>
          </div>
        </div>
      </form>

      {/* Order summary */}
      <aside className="order-1 lg:order-2">
        <div className="rounded-[28px] border border-[rgba(91,196,255,0.18)] bg-[linear-gradient(160deg,rgba(12,25,50,0.92),rgba(13,8,31,0.82))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:p-6 lg:sticky lg:top-[104px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-700 uppercase tracking-[0.22em] text-polar-purple-light">
                Resumen
              </p>
              <h2 className="mt-2 font-display text-2xl font-700 text-polar-text">
                Tu pedido
              </h2>
            </div>
            <span className="rounded-full border border-[rgba(91,196,255,0.22)] bg-[rgba(91,196,255,0.1)] px-3 py-1 text-xs font-700 text-[#BDEFFF]">
              {mounted ? `${items.length} sabores` : "Cargando"}
            </span>
          </div>

          {!mounted ? (
            <p className="mt-6 text-sm text-polar-muted">Cargando carrito...</p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[rgba(255,255,255,0.06)]">
                    <ProductThumb
                      src={item.imageUrl}
                      alt={item.name}
                      width={56}
                      height={56}
                      placeholderClassName="h-12 w-12"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-600 text-polar-text">
                      {item.name}
                    </p>
                    <p className="text-xs text-polar-muted">
                      {formatCop(item.unitPriceCop)} c/u
                    </p>

                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[rgba(167,73,197,0.24)] bg-[rgba(8,10,28,0.62)] px-1.5 py-0.5">
                      <button
                        type="button"
                        aria-label={`Quitar uno de ${item.name}`}
                        onClick={() =>
                          item.qty <= 1
                            ? removeItem(item.productId)
                            : setQty(item.productId, item.qty - 1)
                        }
                        className="flex h-6 w-6 items-center justify-center rounded-full text-polar-muted2 transition-colors hover:text-polar-text"
                      >
                        <span aria-hidden className="text-base leading-none">
                          −
                        </span>
                      </button>
                      <span className="min-w-5 text-center text-sm font-600 text-polar-text">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Agregar uno de ${item.name}`}
                        onClick={() => setQty(item.productId, item.qty + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-polar-muted2 transition-colors hover:text-polar-text"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 self-start pt-1">
                    <span className="text-sm font-700 text-polar-text">
                      {formatCop(item.unitPriceCop * item.qty)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-xs text-polar-dim transition-colors hover:text-[#f3a9c1]"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-[rgba(167,73,197,0.18)] pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-polar-muted">Subtotal</span>
              <span className="text-sm font-600 text-polar-text">
                {mounted ? formatCop(subtotalCop) : formatCop(0)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-600 text-polar-text">
                Total a pagar
              </span>
              <span className="font-display text-2xl font-700 text-polar-text">
                {mounted ? formatCop(totalCop) : formatCop(0)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-polar-dim">
              Pago contra entrega. Confirmamos disponibilidad y horario antes
              de preparar tu pedido.
            </p>
          </div>

          <Link
            href="/menu"
            className="mt-5 block rounded-2xl border border-[rgba(177,93,255,0.22)] px-4 py-3 text-center text-sm font-600 text-polar-muted transition-colors hover:border-[rgba(177,93,255,0.44)] hover:text-polar-text"
          >
            Seguir agregando sabores
          </Link>
        </div>
      </aside>
    </div>
  );
}
