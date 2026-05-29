"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { PolarLogo } from "@/components/icons";
import { signOut } from "@/lib/actions/auth";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/categories", label: "Categorías" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-[rgba(167,73,197,0.15)] bg-[rgba(15,10,34,0.5)] p-5 md:h-[calc(100vh-88px)] md:w-60 md:border-b-0 md:border-r">
      <Link href="/admin" className="flex items-center gap-3">
        <PolarLogo className="h-10 w-10 text-polar-text" />
        <div className="leading-tight">
          <p className="font-display text-base font-700 text-polar-text">
            Polar
          </p>
          <p className="text-xs text-polar-dim">Panel de administración</p>
        </div>
      </Link>

      <nav className="flex flex-row flex-wrap gap-1.5 md:flex-1 md:flex-col">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-xl px-4 py-2.5 text-sm font-500 transition-colors",
                active
                  ? "bg-[linear-gradient(105deg,#a749c5,#9128da)] text-white shadow-[0_8px_24px_rgba(146,40,218,0.3)]"
                  : "text-polar-muted2 hover:bg-[rgba(255,255,255,0.04)] hover:text-polar-text",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-[rgba(167,73,197,0.12)] pt-4">
        {email && (
          <p className="truncate text-xs text-polar-dim" title={email}>
            {email}
          </p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="btn-ghost h-10 w-full text-sm"
          >
            Cerrar sesión
          </button>
        </form>
        <Link
          href="/"
          className="text-center text-xs text-polar-dim transition-colors hover:text-polar-text"
        >
          Ver la tienda
        </Link>
      </div>
    </aside>
  );
}
