"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/config";
import type { PromoBanner as PromoBannerType } from "@/lib/types";

interface PromoBannerProps {
  banner: PromoBannerType;
}

/**
 * "Nuevo" promotional banner: a wide image with a heading and a COMPRAR button.
 * The box keeps the promo photos' 12:5 ratio at every width so they are never
 * cropped.
 * COMPRAR adds the linked product to the cart; with no linked product it follows
 * `href` (falling back to the menu). A brand gradient sits under the image so a
 * missing/broken image still reads well.
 */
export function PromoBanner({ banner }: PromoBannerProps) {
  const { addItem, openCart } = useCart();
  const [broken, setBroken] = useState(false);
  const { product, imageUrl, heading } = banner;
  // Same sold-out rule as ProductCard: tracked stock at zero counts as sold out.
  const soldOut = !!product && (product.soldOut || product.stockQty === 0);

  function handleBuy() {
    if (!product || soldOut) return;
    addItem(product);
    openCart();
  }

  return (
    <div className="relative flex aspect-[12/5] items-stretch overflow-hidden rounded-[16px] bg-[linear-gradient(110deg,#19034b,#5d2da9,#b231ca)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
      {imageUrl && !broken ? (
        <Image
          src={imageUrl}
          alt={heading}
          fill
          sizes="(min-width: 768px) 720px, 100vw"
          className="object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        /* No own image: show the generic product cup on the right instead of a
           bare gradient. It is decorative here, so alt is empty. */
        <Image
          src={PRODUCT_IMAGE_FALLBACK}
          alt=""
          width={240}
          height={300}
          sizes="(min-width: 768px) 240px, 45vw"
          className="absolute bottom-0 right-[8%] h-[80%] w-auto object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.4)]"
        />
      )}

      {/* Light legibility scrim on the left where the copy sits; the photos are
          already dark there. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,18,0.55)_0%,rgba(4,5,18,0.2)_38%,rgba(4,5,18,0)_65%)]" />

      <div className="relative z-10 flex max-w-[52%] flex-col justify-center gap-1.5 px-[14px] py-[10px] sm:gap-2 sm:px-[18px] sm:py-[14px] md:max-w-[46%] md:gap-3 md:px-[28px] md:py-[20px]">
        <h3 className="font-display text-[12px] font-extrabold uppercase leading-[1.1] text-white sm:text-[15px] md:text-[22px]">
          {heading}
        </h3>

        {product ? (
          <button
            type="button"
            onClick={handleBuy}
            disabled={soldOut}
            aria-disabled={soldOut}
            aria-label={
              soldOut
                ? `${product.name} agotado`
                : `Comprar ${product.name}`
            }
            className="inline-flex h-[24px] w-fit items-center justify-center rounded-[6px] border border-white/40 bg-white/10 px-[10px] text-[9px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/10 sm:h-[28px] sm:px-[14px] sm:text-[10px] md:h-[34px] md:px-[20px] md:text-[12px] md:tracking-[0.12em]"
          >
            {soldOut ? "Agotado" : "Comprar"}
          </button>
        ) : (
          <Link
            href={banner.href ?? "/menu"}
            className="inline-flex h-[24px] w-fit items-center justify-center rounded-[6px] border border-white/40 bg-white/10 px-[10px] text-[9px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:h-[28px] sm:px-[14px] sm:text-[10px] md:h-[34px] md:px-[20px] md:text-[12px] md:tracking-[0.12em]"
          >
            Comprar
          </Link>
        )}
      </div>
    </div>
  );
}
