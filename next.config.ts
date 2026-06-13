import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local product/hero art lives under /public/images (optimized automatically).
    // In DB mode product photos are served from Supabase Storage, so allow those.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
    // Serve modern formats (Vercel negotiates per request) for smaller payloads.
    formats: ["image/avif", "image/webp"],
    // Small fixed render widths actually used via `sizes` (footer logo 90px,
    // product card 180px, hero cup 340px). These are concatenated with the
    // default deviceSizes and let the optimizer emit suitably small candidates
    // instead of jumping to the 640px deviceSizes floor. All values must stay
    // below the smallest deviceSize (640); they also cover common DPR steps.
    imageSizes: [90, 180, 340],
  },
};

export default nextConfig;
