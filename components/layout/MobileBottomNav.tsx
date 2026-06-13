"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { CupIcon, WhatsAppIcon } from "@/components/icons";
import { useCart } from "@/components/cart/CartProvider";

interface IconProps {
  className?: string;
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 11.5 12 4l8.5 7.5" />
      <path d="M5.5 10.5V20h4.6v-5.4h3.8V20h4.6v-9.5" />
    </svg>
  );
}

function OrdersIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 8.5V7a5 5 0 0 1 10 0v1.5" />
      <path d="M5.3 8.5h13.4l1 11.5H4.3L5.3 8.5Z" />
      <path d="m9.1 15.2 1.8 1.8 4-4.2" />
    </svg>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "Inicio", Icon: HomeIcon },
  { href: "/menu", label: "Menú", Icon: CupIcon },
  { href: "/checkout", label: "Pedidos", Icon: OrdersIcon },
  { href: "/admin", label: "Cuenta", Icon: UserIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { openCart } = useCart();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[64px] max-w-[360px] items-center justify-between rounded-t-[28px] border border-b-0 border-[rgba(151,98,255,0.28)] bg-[rgba(7,8,26,0.88)] px-[18px] pb-[6px] shadow-[0_-16px_40px_rgba(0,0,0,0.52)] backdrop-blur-md md:hidden"
      aria-label="Navegación móvil"
    >
      {navItems.slice(0, 2).map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex w-[48px] flex-col items-center gap-[3px] text-[10px] font-medium",
              active ? "text-polar-purple-light" : "text-[#DAD5E7]",
            )}
          >
            <Icon className="h-[22px] w-[22px]" />
            <span>{label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={openCart}
        className="mb-[15px] inline-flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#B84DFF] to-[#9128DA] text-white shadow-[0_0_28px_rgba(177,62,255,0.72)]"
        aria-label="Pedir, abrir carrito"
      >
        <WhatsAppIcon className="h-[25px] w-[25px]" />
        <span className="mt-[1px] text-[10px] font-bold">Pedir</span>
      </button>

      {navItems.slice(2).map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex w-[48px] flex-col items-center gap-[3px] text-[10px] font-medium",
              active ? "text-polar-purple-light" : "text-[#DAD5E7]",
            )}
          >
            <Icon className="h-[22px] w-[22px]" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
