"use client";

import { clsx } from "clsx";
import { useCart } from "@/components/cart/CartProvider";
import { CupIcon } from "@/components/icons";

interface CartButtonProps {
  className?: string;
}

/**
 * Standalone cart trigger: brand-gradient pill with a cup glyph and a live
 * item-count badge. The badge is gated behind `mounted` so the server-rendered
 * markup matches the first client render (no hydration mismatch).
 */
export function CartButton({ className }: CartButtonProps) {
  const { itemCount, mounted, openCart } = useCart();
  const showBadge = mounted && itemCount > 0;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Abrir carrito"
      className={clsx("btn-brand relative", className)}
    >
      <CupIcon className="h-[18px] w-[18px]" />
      <span>Carrito</span>
      {showBadge && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-polar-magenta px-1.5 text-[11px] font-bold leading-none text-white shadow-[0_2px_8px_rgba(178,49,202,0.6)]">
          {itemCount}
        </span>
      )}
    </button>
  );
}
