"use client";

import Link from "next/link";
import clsx from "clsx";
import { Container } from "@/components/ui/Container";
import { PolarLogo, WhatsAppIcon } from "@/components/icons";
import { useCart } from "@/components/cart/CartProvider";
import { NAV_LINKS, SITE_NAME } from "@/lib/config";

export function Navbar() {
  const { openCart, itemCount, mounted } = useCart();
  const showBadge = mounted && itemCount > 0;

  return (
    <header className="sticky top-0 z-50 bg-polar-bg/70 backdrop-blur-md">
      {/* Subtle right-side purple glow behind the bar */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-[440px]"
        style={{
          background:
            "radial-gradient(120% 140% at 78% 30%,rgba(146,40,218,0.18) 0%,transparent 60%)",
        }}
        aria-hidden="true"
      />
      <Container className="relative z-10">
        <nav className="flex h-[84px] items-center justify-between">
          {/* Left: brand badge */}
          <Link
            href="/"
            className="flex items-center"
            aria-label={`${SITE_NAME} - Inicio`}
          >
            <PolarLogo className="h-[68px] w-[68px] text-polar-text" />
          </Link>

          {/* Center: nav links */}
          <ul className="hidden items-center gap-[38px] md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[15px] font-medium text-[#E6E3EE] transition-colors hover:text-polar-text"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right: Pide ya pill (opens cart) */}
          <button
            type="button"
            onClick={openCart}
            className={clsx("btn-brand relative", "text-[15px]")}
            aria-label="Pide ya - abrir carrito"
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            <span>Pide ya</span>
            {showBadge && (
              <span
                className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-polar-magenta px-1.5 text-[11px] font-bold text-white ring-2 ring-polar-bg"
                aria-label={`${itemCount} productos en el carrito`}
              >
                {itemCount}
              </span>
            )}
          </button>
        </nav>
      </Container>
    </header>
  );
}

export default Navbar;
