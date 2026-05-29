"use client";

import Image from "next/image";
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
    <div className="flex flex-col p-3">
      {/* Visual: real photo when available, else a generated granizado cup. */}
      <div className="relative mb-3 h-[150px]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 180px, 40vw"
            className="object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PlaceholderCup
              accentColor={product.accentColor}
              className="h-full w-auto drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
            />
          </div>
        )}
      </div>

      <h3 className="font-body text-[16px] font-semibold leading-tight text-white">
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-polar-purple text-white shadow-[0_6px_18px_rgba(146,40,218,0.40)] transition-[filter] hover:brightness-110"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
