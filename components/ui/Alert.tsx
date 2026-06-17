import { clsx } from "clsx";
import type { ReactNode } from "react";

type AlertTone = "error" | "success" | "warning";

const TONE_CLASS: Record<AlertTone, string> = {
  error: "border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] text-[#f3a9c1]",
  success: "border-[rgba(63,181,138,0.4)] bg-[rgba(63,181,138,0.08)] text-[#8fe0bf]",
  warning: "border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.08)] text-[#e0c08a]",
};

interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  /**
   * ARIA role. Defaults to "alert" for error/warning and "status" for success,
   * matching the existing banners; pass an explicit value to override.
   */
  role?: "alert" | "status";
  className?: string;
}

/**
 * Inline notice banner (error / success / warning) used across the admin
 * managers and pages. Mirrors the repeated rounded, tinted banner markup.
 */
export function Alert({ tone, children, role, className }: AlertProps) {
  const resolvedRole = role ?? (tone === "success" ? "status" : "alert");
  return (
    <p
      role={resolvedRole}
      className={clsx(
        "rounded-xl border px-4 py-3 text-sm",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}
