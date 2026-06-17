"use client";

import { useEffect, useRef } from "react";
import { PlusIcon } from "@/components/icons";
import { ProductThumb } from "@/components/menu/ProductThumb";
import { formatCop } from "@/lib/format";
import type { Product } from "@/lib/types";

interface ProductDetailModalProps {
  product: Product;
  soldOut: boolean;
  onClose: () => void;
  onAddToCart: () => void;
}

export function ProductDetailModal({
  product,
  soldOut,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Focus management: remember the trigger, move focus to the close button on
  // open, trap Tab within the dialog, and restore focus to the trigger when the
  // modal unmounts. Mirrors the pattern in CartDrawer.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((el) => el.offsetParent !== null);

    // Move initial focus to the close button (falling back to the dialog).
    (closeButtonRef.current ?? getFocusable()[0] ?? dialog).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", onKeyDown);

    const trigger = triggerRef.current;
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      // Restore focus to the element that opened the modal.
      trigger?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/72 px-4 pb-4 pt-20 backdrop-blur-[10px] md:items-center md:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`product-modal-${product.id}`}
        tabIndex={-1}
        className="relative w-full max-w-[430px] overflow-hidden rounded-[8px] border border-[rgba(177,93,255,0.28)] bg-[rgba(10,7,28,0.96)] shadow-[0_26px_90px_rgba(0,0,0,0.7)] md:max-w-[780px]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle del producto"
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-black/35 text-[15px] font-semibold text-white transition-colors hover:border-[rgba(177,93,255,0.5)]"
        >
          X
        </button>

        <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative flex min-h-[284px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(177,93,255,0.34),rgba(9,6,24,0)_58%)] p-6 md:min-h-[420px]">
            <div
              className="absolute inset-8 rounded-full blur-3xl"
              style={{ backgroundColor: `${product.accentColor}33` }}
            />
            <div className="relative h-[235px] w-full md:h-[340px]">
              <ProductThumb
                src={product.imageUrl}
                alt={product.name}
                accentColor={product.accentColor}
                fill
                sizes="(min-width: 768px) 360px, 86vw"
                className="object-contain drop-shadow-[0_28px_45px_rgba(0,0,0,0.58)]"
                placeholderClassName="h-full w-auto drop-shadow-[0_28px_45px_rgba(0,0,0,0.58)]"
              />
            </div>
          </div>

          <div className="flex flex-col p-5 md:p-7">
            <p className="eyebrow text-[11px]">{product.categoryName}</p>
            <h2
              id={`product-modal-${product.id}`}
              className="mt-3 font-display text-[30px] font-semibold leading-none text-white md:text-[42px]"
            >
              {product.name}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#CFC6DC] md:text-[15px]">
              {product.description}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[8px] border border-[rgba(177,93,255,0.18)] bg-[rgba(177,93,255,0.07)] p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-polar-dim">
                  Precio
                </p>
                <p className="mt-2 text-[18px] font-bold text-white">
                  {formatCop(product.priceCop)}
                </p>
              </div>
              <div className="rounded-[8px] border border-[rgba(177,93,255,0.18)] bg-[rgba(177,93,255,0.07)] p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-polar-dim">
                  Estado
                </p>
                <p className="mt-2 text-[14px] font-semibold text-white">
                  {soldOut ? "Agotado" : "Disponible hoy"}
                </p>
              </div>
            </div>

            <p className="mt-5 text-[13px] leading-relaxed text-polar-muted">
              Pídelo a domicilio o recógelo en nuestro punto Polar en Tuluá.
            </p>

            <button
              type="button"
              onClick={onAddToCart}
              disabled={soldOut}
              aria-disabled={soldOut}
              className="btn-brand mt-6 h-12 w-full justify-center disabled:cursor-not-allowed disabled:opacity-45"
            >
              <PlusIcon className="h-4 w-4" />
              {soldOut ? "No disponible" : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
