"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { CartIcon, PolarLogo, WhatsAppIcon } from "@/components/icons";
import { useCart } from "@/components/cart/CartProvider";
import { useMobileMenu } from "@/components/layout/MobileMenuProvider";
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

export function Navbar({ logoUrl }: { logoUrl?: string }) {
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenuOpen, toggleMobileMenu } =
    useMobileMenu();
  const { openCart, itemCount, mounted } = useCart();
  const showBadge = mounted && itemCount > 0;

  function openCartFromMenu() {
    setMobileMenuOpen(false);
    openCart();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.07)] bg-black md:relative md:border-b-0 md:bg-transparent">
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
          className="flex h-[58px] items-center justify-between md:h-[112px]"
        >
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(177,93,255,0.54)] bg-[rgba(7,8,22,0.72)] text-[#D8B6FF] shadow-[0_0_18px_rgba(145,40,218,0.35)] md:hidden"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-main-menu"
          >
            {mobileMenuOpen ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-[24px] w-[24px] drop-shadow-[0_0_8px_rgba(184,77,255,0.8)]"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6 6 18" />
              </svg>
            ) : (
              <MenuGlyph className="h-[25px] w-[25px] drop-shadow-[0_0_8px_rgba(184,77,255,0.8)]" />
            )}
          </button>

          <Link
            href="/"
            className="hidden items-center md:flex"
            aria-label={`${SITE_NAME} - Inicio`}
          >
            <PolarLogo src={logoUrl} className="h-[42px] drop-shadow-[0_0_18px_rgba(183,132,255,0.45)]" />
          </Link>

          <Link
            href="/"
            className="flex items-center md:hidden"
            aria-label={`${SITE_NAME} - Inicio`}
          >
            <PolarLogo src={logoUrl} className="h-[30px] drop-shadow-[0_0_12px_rgba(183,132,255,0.6)]" />
          </Link>

          <ul className="hidden items-center gap-[38px] md:flex">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className="group relative inline-flex py-1 text-[14px] font-medium text-[#F0EDF7] transition-colors hover:text-polar-text"
                  >
                    {link.label}
                    <span
                      className={
                        active
                          ? "absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-polar-magenta shadow-[0_0_10px_rgba(178,49,202,0.85)]"
                          : "absolute -bottom-1 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-polar-magenta transition-all duration-150 group-hover:w-full"
                      }
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mr-[22px] hidden items-center gap-2 md:inline-flex">
            <button
              type="button"
              onClick={openCart}
              className="relative btn-brand h-[42px] px-[18px] text-[15px]"
              aria-label="Pide ya - abrir carrito"
            >
              <WhatsAppIcon className="h-[18px] w-[18px]" />
              <span>Pide ya</span>
            </button>

            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[rgba(177,93,255,0.54)] bg-[rgba(7,8,22,0.72)] text-white shadow-[0_0_20px_rgba(145,40,218,0.38)] transition-colors hover:bg-[rgba(146,40,218,0.22)]"
              aria-label="Abrir carrito"
            >
              <CartIcon className="h-[22px] w-[22px]" />
              {showBadge && (
                <span
                  className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-polar-magenta px-1.5 text-[11px] font-bold text-white ring-2 ring-polar-bg"
                  aria-label={`${itemCount} productos en el carrito`}
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>

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

        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenuOpen(false)}
          tabIndex={mobileMenuOpen ? undefined : -1}
          className={`fixed bottom-0 left-0 right-0 top-[58px] z-30 bg-black/42 backdrop-blur-md transition-opacity duration-300 md:hidden ${
            mobileMenuOpen
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        />

        <div
          id="mobile-main-menu"
          aria-hidden={!mobileMenuOpen}
          className={`fixed bottom-0 left-0 top-[58px] z-40 flex w-[80vw] max-w-[380px] flex-col border-r border-t border-[rgba(177,93,255,0.24)] bg-[rgba(7,8,22,0.97)] px-6 pb-[calc(88px+env(safe-area-inset-bottom))] pt-7 shadow-[18px_0_48px_rgba(0,0,0,0.62)] transition-transform duration-300 ease-out md:hidden ${
            mobileMenuOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
          }`}
        >
          <ul className="flex flex-1 flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    tabIndex={mobileMenuOpen ? undefined : -1}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "flex h-14 items-center rounded-2xl bg-[rgba(146,40,218,0.28)] px-4 text-[20px] font-700 text-white"
                        : "flex h-14 items-center rounded-2xl px-4 text-[20px] font-600 text-[#DAD5E7] transition-colors hover:bg-white/5 hover:text-white"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={openCartFromMenu}
            tabIndex={mobileMenuOpen ? undefined : -1}
            className="btn-brand h-12 w-full text-base"
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            Pide ya
          </button>
        </div>
      </Container>
    </header>
  );
}
