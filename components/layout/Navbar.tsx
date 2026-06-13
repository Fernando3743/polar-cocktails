"use client";

import Link from "next/link";
import clsx from "clsx";
import { Container } from "@/components/ui/Container";
import { CartIcon, PolarLogo, WhatsAppIcon } from "@/components/icons";
import { useCart } from "@/components/cart/CartProvider";
import { NAV_LINKS, SITE_NAME } from "@/lib/config";

function MenuGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function Navbar() {
  const { openCart, itemCount, mounted } = useCart();
  const showBadge = mounted && itemCount > 0;

  return (
    <header className="relative z-50 border-b border-[rgba(255,255,255,0.07)] bg-black md:border-b-0 md:bg-transparent">
      <div
        className="pointer-events-none absolute right-0 top-0 hidden h-full w-[520px] md:block"
        style={{
          background:
            "radial-gradient(120% 140% at 78% 30%,rgba(146,40,218,0.24) 0%,transparent 62%)",
        }}
        aria-hidden="true"
      />
      <Container className="relative z-10 px-5 md:px-9 lg:px-10">
        <nav
          aria-label="Navegación principal"
          className="flex h-[58px] items-center justify-between md:h-[132px] md:items-start md:pt-[17px]"
        >
          <button
            type="button"
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-[#D8B6FF] md:hidden"
            aria-label="Abrir menú"
          >
            <MenuGlyph className="h-[25px] w-[25px] drop-shadow-[0_0_8px_rgba(184,77,255,0.8)]" />
          </button>

          <Link
            href="/"
            className="hidden items-center md:flex"
            aria-label={`${SITE_NAME} - Inicio`}
          >
            <PolarLogo className="h-[98px] w-[98px] text-polar-text" />
          </Link>

          <Link
            href="/"
            className="font-display text-[34px] leading-none text-white drop-shadow-[0_0_16px_rgba(183,132,255,0.7)] md:hidden"
            aria-label={`${SITE_NAME} - Inicio`}
          >
            POLAR
          </Link>

          <ul className="mt-[36px] hidden items-center gap-[38px] md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[14px] font-medium text-[#F0EDF7] transition-colors hover:text-polar-text"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={openCart}
            className={clsx(
              "relative",
              "hidden md:inline-flex",
              "btn-brand mt-[20px] mr-[22px] h-[42px] px-[18px] text-[15px]",
            )}
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

          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[rgba(177,93,255,0.54)] bg-[rgba(7,8,22,0.72)] text-white shadow-[0_0_20px_rgba(145,40,218,0.38)] md:hidden"
            aria-label="Abrir carrito"
          >
            <CartIcon className="h-[24px] w-[24px]" />
            {showBadge && (
              <span
                className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#A92DFF] px-1 text-[10px] font-bold text-white"
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
