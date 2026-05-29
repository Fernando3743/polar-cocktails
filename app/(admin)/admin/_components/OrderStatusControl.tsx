"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { updateOrderStatus } from "@/lib/actions/orders";
import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUSES, STATUS_LABELS } from "../_lib/status";

export function OrderStatusControl({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<OrderStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleChange(next: OrderStatus) {
    setValue(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (!result.ok) {
        setError(result.error ?? "No se pudo actualizar.");
        setValue(current);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.14em] text-polar-dim">
        Estado del pedido
      </span>
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((status) => {
          const isActive = value === status;
          return (
            <button
              key={status}
              type="button"
              disabled={pending}
              onClick={() => handleChange(status)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-500 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "bg-[linear-gradient(105deg,#a749c5,#9128da)] text-white shadow-[0_8px_24px_rgba(146,40,218,0.3)]"
                  : "border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] text-polar-muted2 hover:border-[rgba(167,73,197,0.45)]",
              )}
            >
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>
      {pending && <p className="text-xs text-polar-dim">Guardando...</p>}
      {saved && !pending && !error && (
        <p className="text-xs text-[#7fd0b3]">Estado actualizado.</p>
      )}
      {error && (
        <p className="text-xs text-[#f3a9c1]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
