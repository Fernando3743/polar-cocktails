"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUSES, STATUS_LABELS } from "../_lib/status";

export function OrderStatusFilter({
  active,
  q,
}: {
  active?: OrderStatus;
  q?: string;
}) {
  const options: { value: OrderStatus | null; label: string }[] = [
    { value: null, label: "Todos" },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
  ];

  // Switching status resets to page 1 but preserves the active search term.
  function buildHref(status: OrderStatus | null): string {
    const search = new URLSearchParams();
    if (status) search.set("status", status);
    if (q) search.set("q", q);
    const qs = search.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = active === opt.value || (!active && opt.value === null);
        const href = buildHref(opt.value);
        return (
          <Link
            key={opt.label}
            href={href}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-500 transition-colors",
              isActive
                ? "bg-[linear-gradient(105deg,#a749c5,#9128da)] text-white shadow-[0_8px_24px_rgba(146,40,218,0.3)]"
                : "border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] text-polar-muted2 hover:border-[rgba(167,73,197,0.45)]",
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
