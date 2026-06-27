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
 * COMPRAR adds the linked product to the cart; with no linked product it follows
 * `href` (falling back to the menu). A brand gradient sits under the image so a
 * missing/broken image still reads well.
 */
export function PromoBanner({ banner }: PromoBannerProps) {
  const { addItem, openCart } = useCart();
  const [broken, setBroken] = useState(false);
  const { product, imageUrl, heading } = banner;

  function handleBuy() {
    if (!product) return;
    addItem(product);
    openCart();
  }

  return (
    <div className="relative flex min-h-[200px] items-stretch overflow-hidden rounded-[16px] bg-[linear-gradient(110deg,#19034b,#5d2da9,#b231ca)] shadow-[0_18px_40px_rgba(0,0,0,0.45)] md:min-h-[230px]">
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

      {/* Legibility scrim over the image, biased to the left where the copy sits. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,18,0.78)_0%,rgba(4,5,18,0.45)_55%,rgba(4,5,18,0.1)_100%)]" />

      <div className="relative z-10 flex max-w-[68%] flex-col justify-center gap-3 px-[22px] py-[20px] md:max-w-[60%] md:px-[28px]">
        <h3 className="font-display text-[18px] font-extrabold uppercase leading-[1.05] text-white md:text-[22px]">
          {heading}
        </h3>

        {product ? (
          <button
            type="button"
            onClick={handleBuy}
            aria-label={`Comprar ${product.name}`}
            className="inline-flex h-[34px] w-fit items-center justify-center rounded-[8px] border border-white/40 bg-white/10 px-[20px] text-[12px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Comprar
          </button>
        ) : (
          <Link
            href={banner.href ?? "/menu"}
            className="inline-flex h-[34px] w-fit items-center justify-center rounded-[8px] border border-white/40 bg-white/10 px-[20px] text-[12px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Comprar
          </Link>
        )}
      </div>
    </div>
  );
}
