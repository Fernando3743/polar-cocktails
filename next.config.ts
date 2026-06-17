import type { NextConfig } from "next";

// Pin remote images to the exact Supabase Storage hostname when configured. In
// demo/zero-env (no NEXT_PUBLIC_SUPABASE_URL) keep the broad "**.supabase.co"
// pattern so the seed/build path renders without any Supabase configuration.
function supabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      return { protocol: "https" as const, hostname: new URL(url).hostname };
    } catch {
      // fall through to the broad pattern on a malformed URL
    }
  }
  return { protocol: "https" as const, hostname: "**.supabase.co" };
}

const nextConfig: NextConfig = {
  images: {
    // Local product/hero art lives under /public/images (optimized automatically).
    // In DB mode product photos are served from Supabase Storage, so allow those.
    remotePatterns: [supabaseImagePattern()],
    // Serve modern formats (Vercel negotiates per request) for smaller payloads.
    formats: ["image/avif", "image/webp"],
    // Small fixed render widths actually used via `sizes` (footer logo 90px,
    // product card 180px, hero cup 340px). These are concatenated with the
    // default deviceSizes and let the optimizer emit suitably small candidates
    // instead of jumping to the 640px deviceSizes floor. All values must stay
    // below the smallest deviceSize (640); they also cover common DPR steps.
    // 256 gives DPR-2 phones a tighter product-cup candidate than 340.
    imageSizes: [90, 180, 256, 340],
    // Allowlist the quality levels we request. The default (75) stays for hero
    // art; product-grid cups render small, so they ship at 60 (visually lossless
    // at that size, ~15-20% smaller AVIF). Next 16 requires this allowlist.
    qualities: [60, 75],
  },
  async headers() {
    // Content-Security-Policy is intentionally Report-Only (not enforcing): the
    // app relies on inline styles (Tailwind v4) and Vercel Analytics scripts, so
    // a strict policy would break it today. Observe the violation reports, then
    // promote this to the enforcing `Content-Security-Policy` header.
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
      "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
