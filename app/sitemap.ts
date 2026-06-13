import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Stable content-revision date; bump when home/menu/seed catalog content changes.
const SITE_CONTENT_UPDATED = new Date("2026-06-13");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = SITE_CONTENT_UPDATED;
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/menu`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
