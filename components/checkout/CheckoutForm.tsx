"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { useCart } from "@/components/cart/CartProvider";
import { createOrder, validatePromo } from "@/lib/actions/orders";
import { orderSchema } from "@/lib/validation/schemas";
import { formatCop } from "@/lib/format";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { whatsappSummaryFromOrder } from "@/lib/whatsapp";
import { PlaceholderCup, PlusIcon, TicketIcon } from "@/components/icons";
import type { DeliveryType, OrderInput, PromoValidation } from "@/lib/types";

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

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoValidation | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Clear any applied promo when the subtotal changes so the displayed
  // discount never drifts from the current cart (percent / min-subtotal codes).
  // Done by adjusting state during render — keyed on the previous subtotal —
  // instead of a setState-in-effect, which avoids an extra render pass.
  const [prevSubtotalCop, setPrevSubtotalCop] = useState(subtotalCop);
  if (prevSubtotalCop !== subtotalCop) {
    setPrevSubtotalCop(subtotalCop);
    setAppliedPromo(null);
    setPromoError(null);
  }

  const isEmpty = mounted && items.length === 0;

  const discountCop = appliedPromo?.valid ? appliedPromo.discountCop : 0;
  const totalCop = Math.max(0, subtotalCop - discountCop);

  const orderItems = useMemo(
    () => items.map((i) => ({ productId: i.productId, qty: i.qty })),
    [items],
  );

  async function applyPromo() {
    setPromoError(null);
    setCheckingPromo(true);
    try {
      const v = await validatePromo(promoCode, subtotalCop);
      if (!v.valid) {
        setAppliedPromo(null);
        setPromoError(v.reason ?? "Código no válido.");
        return;
      }
      setAppliedPromo(v);
    } catch {
      setAppliedPromo(null);
      setPromoError("No pudimos validar el código. Inténtalo de nuevo.");
    } finally {
      setCheckingPromo(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoCode("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const appliedCode =
      appliedPromo?.valid && promoCode.trim()
        ? promoCode.trim().toUpperCase()
        : undefined;

    const input: OrderInput = {
      customerName,
      customerPhone,
      deliveryType,
      address: deliveryType === "delivery" ? address : undefined,
      notes: notes.trim() ? notes : undefined,
      promoCode: appliedCode,
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
    try {
      const result = await createOrder(parsed.data);
      if (result.ok) {
        // Carry the order to the confirmation page (the reliable path in both
        // modes: demo orders aren't persisted, and RLS blocks the customer from
        // reading a DB order). The summary is the SERVER-trusted one returned by
        // createOrder / the create_order RPC — line items, subtotal, discount,
        // and total are all server-computed here, never cart values. Contact /
        // delivery fields come from the normalized parsed input so the displayed
        // and WhatsApp phone match what is persisted.
        const payload = {
          orderId: result.orderId,
          summary: whatsappSummaryFromOrder(result.summary, {
            orderRef: result.summary.shortCode ?? result.orderId,
            customerName: parsed.data.customerName,
            customerPhone: parsed.data.customerPhone,
            deliveryType: parsed.data.deliveryType,
            address:
              parsed.data.deliveryType === "delivery"
                ? (parsed.data.address ?? null)
                : null,
            notes: parsed.data.notes ?? null,
          }),
        };
        try {
          sessionStorage.setItem("polar_last_order", JSON.stringify(payload));
        } catch {
          // private mode / quota: confirmation page falls back to the generic link
        }
        clear();

        // Demo mode does not persist the order and has no server-side read path,
        // so carry the server-computed code/discount to the confirmation page as
        // a banner fallback. In DB mode these params are ignored (not trusted).
        const summaryDiscount = result.summary.discountCop;
        const summaryCode = result.summary.promoCode;
        const query =
          !hasSupabaseEnv() && summaryCode && summaryDiscount > 0
            ? `?code=${encodeURIComponent(summaryCode)}&discount=${summaryDiscount}`
            : "";
        router.push(`/order/${result.orderId}${query}`);
      } else {
        setFormError(result.error);
        setSubmitting(false);
      }
    } catch {
      setFormError("No pudimos procesar tu pedido. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  if (mounted && isEmpty) {
    return (
      <div className="glass-card flex flex-col items-center gap-5 px-6 py-12 text-center">
        <p className="font-display text-xl font-600 text-polar-text">
          Tu carrito está vacío
        </p>
        <p className="max-w-[360px] text-sm text-polar-muted">
          Agrega algunos granizados antes de pasar a pagar.
        </p>
        <Link href="/menu" className="btn-brand">
          Ver el menú
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="order-2 lg:order-1">
        <div className="glass-card flex flex-col gap-6 p-6">
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
                      "h-11 rounded-xl border text-sm font-600 transition-colors",
                      active
                        ? "border-transparent bg-[linear-gradient(105deg,#a749c5,#9128da)] text-white shadow-[0_8px_24px_rgba(146,40,218,0.35)]"
                        : "border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] text-polar-muted2 hover:border-[rgba(167,73,197,0.45)]",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

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
              className={inputClass(!!errors.customerName)}
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
              className={inputClass(!!errors.customerPhone)}
            />
          </Field>

          {deliveryType === "delivery" && (
            <Field id="address" label="Dirección de entrega" error={errors.address}>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="Calle 41a # 26-81, barrio..."
                className={inputClass(!!errors.address)}
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
              className={clsx(inputClass(false), "min-h-[88px] resize-y py-3")}
            />
          </Field>

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] px-4 py-3 text-sm text-[#f3a9c1]"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || isEmpty}
            className="btn-brand h-[50px] w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Procesando..." : "Confirmar pedido"}
          </button>
        </div>
      </form>

      {/* Order summary */}
      <aside className="order-1 lg:order-2">
        <div className="glass-card flex flex-col gap-4 p-6 lg:sticky lg:top-[104px]">
          <h2 className="font-display text-lg font-600 text-polar-text">
            Tu pedido
          </h2>

          {!mounted ? (
            <p className="text-sm text-polar-muted">Cargando carrito...</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgba(25,3,75,0.4)]">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PlaceholderCup
                        accentColor={item.accentColor}
                        className="h-12 w-12"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-600 text-polar-text">
                      {item.name}
                    </p>
                    <p className="text-xs text-polar-muted">
                      {formatCop(item.unitPriceCop)} c/u
                    </p>

                    <div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] px-1.5 py-0.5">
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

                  <div className="flex flex-col items-end gap-1">
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

          {/* Promo code */}
          <div className="mt-2 flex flex-col gap-2 border-t border-[rgba(167,73,197,0.15)] pt-4">
            {appliedPromo?.valid ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(146,40,218,0.35)] bg-[rgba(146,40,218,0.1)] px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm font-600 text-polar-text">
                  <TicketIcon className="h-4 w-4 text-polar-magenta" />
                  {promoCode.trim().toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={removePromo}
                  className="text-xs text-polar-dim transition-colors hover:text-[#f3a9c1]"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <TicketIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-polar-dim" />
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Código de descuento"
                      aria-label="Código de descuento"
                      autoCapitalize="characters"
                      className={clsx(inputClass(!!promoError), "pl-9")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={checkingPromo || !promoCode.trim() || !mounted}
                    className="btn-outline-rect h-11 shrink-0 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkingPromo ? "..." : "Aplicar"}
                  </button>
                </div>
                {promoError && (
                  <p className="text-xs text-[#f3a9c1]" role="alert">
                    {promoError}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-[rgba(167,73,197,0.15)] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-polar-muted">Subtotal</span>
              <span className="text-sm font-600 text-polar-text">
                {mounted ? formatCop(subtotalCop) : formatCop(0)}
              </span>
            </div>
            {mounted && discountCop > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-polar-muted">Descuento</span>
                <span className="text-sm font-600 text-polar-magenta">
                  -{formatCop(discountCop)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-polar-muted">Total</span>
              <span className="font-display text-xl font-700 text-polar-text">
                {mounted ? formatCop(totalCop) : formatCop(0)}
              </span>
            </div>
          </div>

          <Link
            href="/menu"
            className="text-center text-sm text-polar-muted transition-colors hover:text-polar-text"
          >
            Seguir agregando sabores
          </Link>
        </div>
      </aside>
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return clsx(
    "h-11 w-full rounded-xl border bg-[rgba(25,3,75,0.35)] px-4 text-sm text-polar-text placeholder:text-polar-dim transition-colors outline-none",
    "focus:border-polar-purple-light focus:ring-2 focus:ring-[rgba(146,40,218,0.25)]",
    hasError
      ? "border-[rgba(226,69,122,0.6)]"
      : "border-[rgba(167,73,197,0.2)]",
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-600 text-polar-text">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-[#f3a9c1]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
