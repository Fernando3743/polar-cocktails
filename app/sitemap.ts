import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { NAV_LINKS } from "@/lib/config";

// Stable content-revision date; bump when home/menu/seed catalog content changes.
const SITE_CONTENT_UPDATED = new Date("2026-06-13");

// Per-route changeFrequency/priority overrides; routes not listed here fall back
// to the monthly/0.6 default so new public NAV_LINKS routes are picked up
// automatically without editing this file.
const ROUTE_META: Record<
  string,
  { changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }
> = {
  "/": { changeFrequency: "weekly", priority: 1 },
  "/menu": { changeFrequency: "weekly", priority: 0.8 },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = SITE_CONTENT_UPDATED;
  // Derive entries from the public nav so adding a route there also adds it here.
  return NAV_LINKS.filter((link) => link.href.startsWith("/")).map((link) => {
    const meta = ROUTE_META[link.href] ?? {
      changeFrequency: "monthly" as const,
      priority: 0.6,
    };
    return {
      url: `${base}${link.href}`,
      lastModified,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });
}
