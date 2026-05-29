"use client";

import { PlaceholderCup, PlusIcon } from "@/components/icons";
import { useCart } from "@/components/cart/CartProvider";
import { formatCop } from "@/lib/format";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();

  function handleAdd() {
    addItem(product);
    openCart();
  }

  return (
    <div className="glass-card flex flex-col p-4">
      {/* Visual: real photo when available, else a generated granizado cup. */}
      <div className="mb-4 flex h-[188px] items-center justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-[188px] w-full object-contain"
          />
        ) : (
          <PlaceholderCup
            accentColor={product.accentColor}
            className="h-[188px] w-auto drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
          />
        )}
      </div>

      <h3 className="font-body text-[18px] font-semibold leading-tight text-white">
        {product.name}
      </h3>
      <p className="mt-1.5 text-[13px] leading-snug text-polar-muted">
        {product.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-body text-[18px] font-bold text-white">
          {formatCop(product.priceCop)}
        </span>
        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Agregar ${product.name} al carrito`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-[filter] hover:brightness-110"
          style={{
            background: "linear-gradient(105deg,#A749C5 0%,#9128DA 100%)",
            boxShadow: "0 6px 18px rgba(146,40,218,0.40)",
          }}
        >
          <PlusIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
