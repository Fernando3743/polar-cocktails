"use client";

import { type MouseEvent, useState } from "react";
import { clsx } from "clsx";
import { PlusIcon } from "@/components/icons";
import { ProductDetailModal } from "@/components/menu/ProductDetailModal";
import { ProductThumb } from "@/components/menu/ProductThumb";
import { useCart } from "@/components/cart/CartProvider";
import { formatCop } from "@/lib/format";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isFeatured = product.sortOrder === 1;
  // Tracked products at zero stock are sold out too; untracked stock is null/undefined.
  const soldOut = product.soldOut || product.stockQty === 0;

  function handleAdd(event?: MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation();
    if (soldOut) return;
    addItem(product);
    openCart();
  }

  function handleAddFromModal() {
    if (soldOut) return;
    addItem(product);
    setDetailsOpen(false);
    openCart();
  }

  return (
    <>
      <div
        className="relative flex h-[196px] cursor-pointer flex-col overflow-hidden rounded-[8px] border border-[rgba(167,73,197,0.24)] bg-[rgba(13,12,32,0.86)] p-[14px] shadow-[0_12px_28px_rgba(0,0,0,0.46)] transition-[border-color,transform] hover:border-[rgba(184,77,255,0.52)] md:h-[323px] md:p-[14px]"
      >
      {/* Stretched trigger: a real button covering the card opens the detail
          modal (keyboard + screen-reader accessible) while the add-to-cart
          buttons sit above it at a higher z-index and stay independently
          clickable. */}
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        aria-label={`Ver detalles de ${product.name}`}
        className="absolute inset-0 z-10 rounded-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-polar-purple"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        aria-disabled={soldOut}
        aria-label={`Agregar ${product.name} al carrito`}
        className={clsx(
          "absolute right-[10px] top-[9px] z-20 inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-polar-purple text-white shadow-[0_6px_18px_rgba(146,40,218,0.54)] transition-[filter] hover:brightness-110 md:hidden",
          soldOut && "opacity-40 cursor-not-allowed pointer-events-none",
        )}
      >
        <PlusIcon className="h-[15px] w-[15px]" />
      </button>

      <div className="relative mb-[3px] flex h-[122px] items-center justify-center md:mb-[8px] md:h-[181px]">
        <ProductThumb
          src={product.imageUrl}
          alt={product.name}
          accentColor={product.accentColor}
          fill
          sizes="(min-width: 1024px) 180px, 40vw"
          className="object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)]"
          placeholderClassName="h-full w-auto drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
        />
      </div>

      {isFeatured && (
        <span className="absolute left-[10px] top-[10px] z-20 inline-flex h-[17px] items-center rounded-full border border-[rgba(184,77,255,0.7)] bg-[rgba(34,12,63,0.82)] px-[9px] text-[8px] font-bold uppercase text-[#DEB7FF] shadow-[0_0_10px_rgba(184,77,255,0.55)] md:hidden">
          Más pedido
        </span>
      )}

      {soldOut && (
        <span className="absolute right-[10px] top-[10px] z-20 inline-flex h-[17px] items-center rounded-full border border-[rgba(126,119,144,0.5)] bg-[rgba(13,12,32,0.9)] px-[9px] text-[8px] font-bold uppercase tracking-wide text-polar-dim md:text-[9px]">
          Agotado
        </span>
      )}

      <h3 className="font-body text-[13px] font-semibold leading-tight text-white md:text-[16px]">
        {product.name}
      </h3>
      <p className="mt-[4px] line-clamp-2 text-[10px] leading-[1.25] text-[#B9B2C6] md:mt-[7px] md:line-clamp-3 md:text-[12px] md:leading-[1.45]">
        {product.description}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className="font-body text-[14px] font-bold text-white md:text-[16px]">
          {formatCop(product.priceCop)}
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          aria-disabled={soldOut}
          aria-label={`Agregar ${product.name} al carrito`}
          className={clsx(
            "relative z-20 hidden h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-polar-purple text-white shadow-[0_6px_18px_rgba(146,40,218,0.40)] transition-[filter] hover:brightness-110 md:inline-flex",
            soldOut && "opacity-40 cursor-not-allowed pointer-events-none",
          )}
        >
          <PlusIcon className="h-[13px] w-[13px]" />
        </button>
      </div>
      </div>

      {detailsOpen && (
        <ProductDetailModal
          product={product}
          soldOut={soldOut}
          onClose={() => setDetailsOpen(false)}
          onAddToCart={handleAddFromModal}
        />
      )}
    </>
  );
}
