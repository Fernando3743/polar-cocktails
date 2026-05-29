import { clsx } from "clsx";
import type { OrderStatus } from "@/lib/types";
import { STATUS_BADGE, STATUS_LABELS } from "../_lib/status";

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-600",
        STATUS_BADGE[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
