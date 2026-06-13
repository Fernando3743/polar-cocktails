"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useCart } from "@/components/cart/CartProvider";
import { formatCop } from "@/lib/format";
import { PlaceholderCup, PlusIcon } from "@/components/icons";
import { ProductThumb } from "@/components/menu/ProductThumb";

export function CartDrawer() {
  const {
    items,
    itemCount,
    subtotalCop,
    setQty,
    removeItem,
    isOpen,
    closeCart,
    mounted,
  } = useCart();

  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Close on Escape and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeCart]);

  // Focus management: remember the trigger, move focus into the panel on open,
  // trap Tab within the panel while open, and restore focus on close.
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((el) => el.offsetParent !== null);

    // Move initial focus into the panel.
    const initial = getFocusable()[0] ?? panel;
    initial.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);

    return () => {
      panel.removeEventListener("keydown", onKeyDown);
      // Restore focus to the element that opened the drawer.
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  // Avoid rendering interactive cart state until hydrated.
  if (!mounted) return null;

  return (
    <>
      {/* Backdrop (decorative; click-to-close is a mouse convenience — keyboard
          users close via Escape or the focus-trapped close button). */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={closeCart}
        className={clsx(
          "fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Slide-over panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        aria-hidden={!isOpen}
        tabIndex={-1}
        className={clsx(
          "fixed right-0 top-0 z-[100] flex h-full w-full max-w-[420px] flex-col",
          "border-l border-polar-purple-light/20 bg-polar-bg2 shadow-[0_0_60px_rgba(0,0,0,0.6)]",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-polar-purple-light/15 px-6 py-5">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-xl font-bold text-polar-text">
              Tu carrito
            </h2>
            {itemCount > 0 && (
              <span className="text-sm text-polar-muted">
                {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-polar-purple-light/25 text-polar-muted transition-colors hover:border-polar-purple-light/50 hover:text-polar-text"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="opacity-60">
              <PlaceholderCup accentColor="#9128DA" className="h-28" />
            </div>
            <p className="font-display text-lg font-semibold text-polar-text">
              Tu carrito está vacío
            </p>
            <p className="max-w-[260px] text-sm text-polar-muted">
              Explora nuestros granizados y agrega tus sabores favoritos.
            </p>
            <Link
              href="/menu"
              onClick={closeCart}
              className="btn-ghost mt-2"
            >
              Ver menú
            </Link>
          </div>
        ) : (
          <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {items.map((item) => (
              <li
                key={item.productId}
                className="glass-card flex items-center gap-3 p-3"
              >
                {/* Thumbnail */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-polar-surface/60">
                  <ProductThumb
                    src={item.imageUrl}
                    alt={item.name}
                    accentColor={item.accentColor}
                    width={64}
                    height={64}
                    placeholderClassName="h-14"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-polar-text">
                    {item.name}
                  </p>
                  <p className="text-sm text-polar-muted">
                    {formatCop(item.unitPriceCop)}
                  </p>

                  {/* Stepper */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.qty - 1)}
                      aria-label={`Disminuir cantidad de ${item.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-polar-purple-light/25 text-polar-muted2 transition-colors hover:border-polar-purple-light/50 hover:text-polar-text"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold text-polar-text">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.qty + 1)}
                      aria-label={`Aumentar cantidad de ${item.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-polar-purple-light/25 text-polar-muted2 transition-colors hover:border-polar-purple-light/50 hover:text-polar-text"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Line total + remove */}
                <div className="flex shrink-0 flex-col items-end justify-between self-stretch py-0.5">
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Eliminar ${item.name}`}
                    className="text-polar-dim transition-colors hover:text-polar-magenta"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                  <span className="text-[15px] font-bold text-polar-text">
                    {formatCop(item.unitPriceCop * item.qty)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-polar-purple-light/15 px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base text-polar-muted2">Subtotal</span>
              <span className="font-display text-2xl font-bold text-polar-text">
                {formatCop(subtotalCop)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="btn-brand w-full"
            >
              Ir a pagar
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
