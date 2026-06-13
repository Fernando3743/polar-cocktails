"use client";

import { usePathname } from "next/navigation";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export function Analytics() {
  const pathname = usePathname();
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS === "1";
  if (!enabled) return null;
  if (pathname?.startsWith("/admin")) return null; // do not track admin
  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
}
