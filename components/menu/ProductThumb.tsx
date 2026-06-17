"use client";

import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { PolarLogo } from "@/components/icons";

interface ProductThumbProps {
  /** Public image URL; when empty/null the Polar logo is shown. */
  src: string | null;
  alt: string;
  /**
   * Layout mode. With `fill`, the parent must be `relative` and sized; the
   * image fills it (storefront card). Otherwise pass `width`/`height` for a
   * fixed-size thumbnail (admin list, cart, checkout).
   */
  fill?: boolean;
  width?: number;
  height?: number;
  /** Responsive sizes hint, only meaningful with `fill`. */
  sizes?: string;
  /** Extra classes on the <Image> (e.g. object-fit, drop-shadow). */
  className?: string;
  /** Extra classes on the Polar logo fallback. */
  placeholderClassName?: string;
}

/**
 * Renders a product image with a single, centralized fallback to the Polar
 * logo — used both when there is no `src` and when the image fails to load
 * (broken/removed URL). This keeps the empty-vs-broken image behavior
 * consistent across the storefront card, admin list, cart, and checkout (UX-3).
 */
export function ProductThumb({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  className,
  placeholderClassName,
}: ProductThumbProps) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return <PolarLogo className={placeholderClassName} />;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 64}
      height={height ?? 64}
      className={clsx("h-full w-full object-contain", className)}
      onError={() => setBroken(true)}
    />
  );
}
