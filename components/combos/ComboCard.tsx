"use client";

import { type MouseEvent } from "react";
import { clsx } from "clsx";
import { PlusIcon } from "@/components/icons";
import { ProductThumb } from "@/components/menu/ProductThumb";
import { useCart } from "@/components/cart/CartProvider";
import { formatCop } from "@/lib/format";
import type { Combo } from "@/lib/types";

interface ComboCardProps {
  combo: Combo;
}

/**
 * Combo card: a light panel with the combo name + magenta price pill on the
 * left and a composite product image on the right, with a round "+" that adds
 * the combo to the cart. Visually distinct from the dark menu ProductCard, by
 * design (mirrors the combos mockup).
 */
export function ComboCard({ combo }: ComboCardProps) {
  const { addCombo, openCart } = useCart();
  const soldOut = combo.soldOut;

  function handleAdd(event?: MouseEvent<HTMLButtonElement>) {
    event?.stopPropagation();
    if (soldOut) return;
    addCombo(combo);
    openCart();
  }

  return (
    <div className="relative grid grid-cols-[1fr_1.1fr] overflow-hidden rounded-[18px] bg-[#f3f1f4] shadow-[0_18px_40px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
      {/* Add-to-cart button (top-right). */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        aria-disabled={soldOut}
        aria-label={`Agregar ${combo.name} al carrito`}
        className={clsx(
          "absolute right-[12px] top-[12px] z-20 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-polar-magenta text-white shadow-[0_8px_20px_rgba(178,49,202,0.5)] transition-[filter] hover:brightness-110",
          soldOut && "opacity-40 cursor-not-allowed pointer-events-none",
        )}
      >
        <PlusIcon className="h-[16px] w-[16px]" />
      </button>

      {/* Left panel: name + price pill. */}
      <div className="flex flex-col justify-center gap-3 px-[20px] py-[24px] md:px-[26px]">
        <h3 className="font-display text-[22px] font-extrabold uppercase leading-[1.02] tracking-tight text-[#15122b] md:text-[26px]">
          {combo.name}
        </h3>
        <span className="inline-flex w-fit items-center rounded-full bg-polar-magenta px-[16px] py-[6px] font-body text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(178,49,202,0.35)] md:text-[17px]">
          {formatCop(combo.priceCop)}
        </span>
        {soldOut && (
          <span className="inline-flex w-fit items-center rounded-full border border-[rgba(126,119,144,0.5)] bg-[rgba(13,12,32,0.06)] px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-wide text-[#7e7790]">
            Agotado
          </span>
        )}
      </div>

      {/* Right panel: composite product image. */}
      <div className="relative min-h-[150px] md:min-h-[176px]">
        <ProductThumb
          src={combo.imageUrl}
          alt={combo.name}
          fill
          sizes="(min-width: 768px) 280px, 55vw"
          quality={70}
          className="object-contain p-3 drop-shadow-[0_14px_24px_rgba(0,0,0,0.28)]"
          placeholderClassName="mx-auto h-full w-auto p-6 opacity-30"
        />
      </div>
    </div>
  );
}
