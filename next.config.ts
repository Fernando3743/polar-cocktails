import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local product/hero art lives under /public/images (optimized automatically).
    // In DB mode product photos are served from Supabase Storage, so allow those.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
