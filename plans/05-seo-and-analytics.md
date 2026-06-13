# Plan 05 — SEO, social metadata & analytics

> Status: Not started · Effort: M · Depends on: none

## Goal
Make the public Polar storefront discoverable and shareable: complete templated metadata with Open Graph/Twitter cards in `app/layout.tsx`, optimized per-route titles, App Router `sitemap.ts` + `robots.ts`, a brand Open Graph image, JSON-LD structured data (`Restaurant` + menu `Product`/`Offer` nodes) sourced from the same `lib/queries/menu` path that already falls back to seed data, and env-gated Vercel analytics that is excluded from admin. Search engines index only `/` and `/menu`; `/admin`, `/checkout`, and `/order/*` are kept out of the index. Demo mode and the static build of `/` and `/menu` must keep working with zero env.

## Scope & non-goals
In scope (per locked decision 3 — "SEO & analytics"):
1. Root metadata: `metadataBase`, default + templated title, Spanish description, keywords, `openGraph` (type website, locale `es_CO`, siteName, url, images), `twitter` summary_large_image; confirm `<html lang="es">` (already present, line 44).
2. Per-route metadata where it differs (`/menu`; tighter home title via the root `title.default`).
3. `app/sitemap.ts` and `app/robots.ts` (Next 16 App Router conventions) listing `/` and `/menu` and disallowing `/admin`, `/checkout`, `/order`; plus per-route `robots: { index: false, follow: false }` on checkout/order/admin-shell routes.
4. Open Graph + Twitter images via the file convention: static `app/opengraph-image.png` and `app/twitter-image.png` (each 1200x630) — simplest, zero runtime cost.
5. JSON-LD: a small server component injecting a `Restaurant`/`LocalBusiness` node + the menu as `Product`/`Offer` nodes, reading `lib/config.ts` (address, WhatsApp) and product data via `getProducts()`; inline `<script type="application/ld+json">`.
6. Analytics: `@vercel/analytics` (and optional `@vercel/speed-insights`) as lowest-friction on Vercel, env/flag-gated and excluded from `/admin`; document Plausible / GA4 via `@next/third-parties` as alternatives; any new dependency updates `package-lock.json`.
7. Favicon/app icons: `app/favicon.ico` already exists (confirmed). Document optional `icon`/`apple-icon` additions, do not block on them.

Explicit non-goals (locked decision 4): no age gate, no customer order tracking, no delivery zones, no business-hours/open-closed schema, no automated shop alerts, no online payments. This plan adds **no** new data writes, **no** API routes, and **no** schema/migrations. It must not change cart, checkout, or order persistence behavior (owned by other workstreams) — it only adds `robots` metadata to those routes.

## Current state
Confirmed by reading the code:

- **Next 16.2.6 / React 19.2.4** (`package.json`). No `@vercel/*` or analytics deps present today. `package.json` also declares `packageManager: "pnpm@10.28.2..."` but the only lockfile on disk is `package-lock.json` (npm); all repo docs use `npm run`. Add deps with `npm install` so `package-lock.json` is the file regenerated — see Risks.
- `app/layout.tsx` (lines 31-35): minimal `metadata` with only `title: "Polar — Cócteles Granizados"` + a Spanish `description`. `<html lang="es">` is already set (line 44). Body mounts `Providers > Navbar / main / Footer / MobileBottomNav / CartDrawer` (lines 48-54). Fonts (Poppins/Inter/Anton) wired via `next/font/google`. **No `metadataBase`, no `openGraph`, no `twitter`, no `title.template`.**
- `app/page.tsx` (home): server component, awaits `getProducts()` + `getCategories()` from `@/lib/queries/menu` (lines 5-11) and returns a fragment containing `<Snowfall />` then a `relative z-10` div. **No per-page metadata** (inherits root title).
- `app/menu/page.tsx` (lines 6-10): has its own `metadata` (title `"Menú — Polar Cócteles Granizados"` + Spanish description). Also awaits `getProducts()` + `getCategories()`.
- `app/checkout/page.tsx` (lines 4-8): `dynamic = "force-dynamic"`, `metadata.title = "Pagar — Polar Cócteles Granizados"`. **No robots noindex.**
- `app/order/[id]/page.tsx` (lines 6-9): `dynamic = "force-dynamic"`, `metadata.title = "Pedido confirmado — Polar"`. `params` is a `Promise` (Next 16) and is `await`ed. **No robots noindex.**
- `app/(admin)/admin/(shell)/layout.tsx` (lines 6-10): `dynamic = "force-dynamic"`, `metadata.title = "Panel — Polar"`, redirects to `/admin/login` unless `hasSupabaseEnv()` and `getUser()` returns a user. **No robots noindex.** Login lives at `app/(admin)/admin/(auth)/login/page.tsx` — a `"use client"` page with no `metadata` export (a client component cannot export `metadata`), so admin noindex must come from `robots.ts` Disallow rather than per-page metadata on the login route.
- `lib/config.ts`: exports `WHATSAPP_NUMBER = "573000000000"` (placeholder), `ADDRESS_LINES = ["Tuluá", "Calle 41a # 26-81", "Paso ancho príncipe"]`, `MAPS_URL`, `SITE_NAME = "Polar"`, `NAV_LINKS`, `whatsappUrl()`. **No site/canonical URL constant.**
- `lib/queries/menu.ts`: `getProducts()` / `getCategories()` already branch on `hasSupabaseEnv()` (lines 75 / 51) and fall back to `SEED_PRODUCTS` / `SEED_CATEGORIES` on missing env or query error. `Product` has `name, slug, description, priceCop, accentColor, imageUrl (string|null), categorySlug, categoryName, sortOrder, isActive` (`lib/types.ts`).
- `lib/format.ts`: `formatCop()` (integer COP) and `slugify()`. Note: schema.org `Offer.price` must be a **plain number string** (e.g. `"18000"`), **not** the `formatCop()` display string — use the raw `priceCop` integer.
- `lib/seed-data.ts`: 4 categories, 6 products (all prices `18000`, `imageUrl -> /images/*-trimmed.png`). Descriptions reference vodka/ron (alcoholic cocktails).
- `lib/supabase/env.ts`: `hasSupabaseEnv()` helper. `.env.example` currently documents only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL` — **no site-URL or analytics var yet.**
- `next.config.ts`: only `images.remotePatterns` for `**.supabase.co`. No other config.
- `public/images/`: real product PNGs (`polar-cocktail-*-trimmed.png`), `polar logo.jpg`, hero images. **No `opengraph-image.png`/`twitter-image.png` anywhere yet.** `app/favicon.ico` exists.
- Verified via `ls`: **no existing `app/sitemap.*`, `app/robots.*`, `app/opengraph-image.*`, `app/twitter-image.*`, `lib/seo.ts`, or `components/seo/`** — all are new.
- Verified the Next 16 local docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/{sitemap,robots,opengraph-image}.md`): `app/sitemap.ts` returns `MetadataRoute.Sitemap` (supports `changeFrequency`/`priority`/`lastModified`), `app/robots.ts` returns `MetadataRoute.Robots` (supports `rules`, `sitemap`, `host`), and `app/opengraph-image.(png|jpg)` / `app/twitter-image.(png|jpg)` are auto-wired into `<head>` with `og:image:width=1200`/`height=630`. The opengraph-image convention does **not** auto-populate `twitter:image` — a separate `twitter-image` file (or explicit `twitter.images`) is required.

## Approach

### Step 1 — Add a canonical site-URL helper (`lib/seo.ts`, new)
Single source of truth for the absolute origin used by `metadataBase`, `sitemap.ts`, `robots.ts`, and JSON-LD. Honors `NEXT_PUBLIC_SITE_URL`, falls back to Vercel's `VERCEL_URL`, then `http://localhost:3000` so demo/local and the static build never break. Keep it lean — it owns only the URL helper + shared text constants; NAP constants stay in `lib/config.ts` and are imported directly where needed.

```ts
// lib/seo.ts

/** Absolute site origin, no trailing slash. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE_DESCRIPTION =
  "Cócteles granizados con una explosión de frescura en Tuluá. " +
  "12 sabores diferentes y 8 combinaciones únicas. Pide por WhatsApp y paga al recibir.";

export const SITE_KEYWORDS = [
  "cócteles granizados",
  "granizados Tuluá",
  "cócteles Tuluá",
  "frozen cocktails",
  "domicilios Tuluá",
  "Polar",
];
```

`SITE_DESCRIPTION` reuses the existing storefront copy ("12 sabores diferentes y 8 combinaciones únicas") from the current `app/layout.tsx` description — do not invent new claims. Note that copy is pre-existing marketing wording (seed-data has only 6 products); it stays only in the meta description, never in structured data.

Append to `.env.example` (under the existing block):
```
# Absolute production origin for SEO (OG/canonical/sitemap/robots/JSON-LD). Public.
# Set this to the production domain on Vercel, e.g. https://polar.example.co
# Absent it, falls back to VERCEL_URL, then http://localhost:3000.
NEXT_PUBLIC_SITE_URL=

# Set to 1 in Vercel production to enable analytics. Empty/absent disables it. Public.
NEXT_PUBLIC_ANALYTICS=
```

### Step 2 — Root metadata in `app/layout.tsx`
Replace the minimal `metadata` (lines 31-35) with a full, templated object. Use `title.template` so per-route pages set only their leaf title; the home page uses `title.default`. Keep the existing `import type { Metadata } from "next";` at line 1.

```ts
import { siteUrl, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/seo";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Polar — Cócteles Granizados en Tuluá",
    template: "%s — Polar",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: SITE_NAME,
    url: siteUrl(),
    title: "Polar — Cócteles Granizados en Tuluá",
    description: SITE_DESCRIPTION,
    // app/opengraph-image.png (Step 5) auto-populates og:image — do not also
    // hardcode openGraph.images here, to avoid duplicate tags.
  },
  twitter: {
    card: "summary_large_image",
    title: "Polar — Cócteles Granizados en Tuluá",
    description: SITE_DESCRIPTION,
    // app/twitter-image.png (Step 5) auto-populates twitter:image.
  },
  robots: { index: true, follow: true },
};
```

Notes:
- The `app/opengraph-image.png` and `app/twitter-image.png` file conventions (Step 5) auto-inject `og:image` and `twitter:image` for every route that inherits root metadata. Do **not** also hardcode `openGraph.images` / `twitter.images` to avoid double tags.
- Keep `<html lang="es">` unchanged (already correct, line 44).
- Reuse the existing description content/tone; do not invent new claims beyond what `lib/config.ts` / seed copy already say.

### Step 3 — Per-route metadata tweaks
- **Home (`app/page.tsx`)**: no per-page `metadata` needed — the root `title.default` ("Polar — Cócteles Granizados en Tuluá") is the optimized home title. Leave the page a server component; do not add a `metadata` export that would override the default.
- **Menu (`app/menu/page.tsx`)**: with the new `title.template`, change `metadata.title` from the full string to just the leaf `"Menú"` so it renders `"Menú — Polar"`. Keep the existing Spanish description (lines 8-9). Add `alternates: { canonical: "/menu" }`.

```ts
// app/menu/page.tsx (replace lines 6-10)
export const metadata = {
  title: "Menú",
  description:
    "Explora todos los sabores de cócteles granizados Polar. Frutales, tropicales, clásicos y especiales.",
  alternates: { canonical: "/menu" },
};
```

- **Checkout (`app/checkout/page.tsx`, lines 6-8)**: leaf title + noindex.
```ts
export const metadata = {
  title: "Pagar",
  robots: { index: false, follow: false },
};
```
- **Order confirmation (`app/order/[id]/page.tsx`, lines 8-10)**: leaf title + noindex (order ids must never be indexed).
```ts
export const metadata = {
  title: "Pedido confirmado",
  robots: { index: false, follow: false },
};
```
- **Admin shell (`app/(admin)/admin/(shell)/layout.tsx`, lines 8-10)**: leaf title `"Panel"` + noindex.
```ts
export const metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};
```
The login page is `"use client"` and cannot export `metadata`; it is covered by the `robots.ts` `/admin` Disallow (Step 6) and is behind auth/redirect anyway.

### Step 4 — JSON-LD structured data (`components/seo/JsonLd.tsx`, new + mount on home)
A **server** component that builds an `@graph` with a `Restaurant`/`LocalBusiness` node and one `Product` node per menu item (with an `Offer`). It reads products through the existing `getProducts()` (so it inherits the `hasSupabaseEnv()` branch + seed fallback automatically) and `lib/config.ts` for NAP data. Inject via a single inline `<script type="application/ld+json">` using `dangerouslySetInnerHTML` (the standard, allowed pattern for JSON-LD — structured data, not emoji/UI).

```tsx
// components/seo/JsonLd.tsx
import { getProducts } from "@/lib/queries/menu";
import { siteUrl } from "@/lib/seo";
import { SITE_NAME, ADDRESS_LINES, MAPS_URL, WHATSAPP_NUMBER } from "@/lib/config";

export async function JsonLd() {
  const origin = siteUrl();
  const products = await getProducts(); // branches on hasSupabaseEnv(), seed fallback

  const business = {
    "@type": "Restaurant",
    "@id": `${origin}/#business`,
    name: SITE_NAME,
    url: origin,
    image: `${origin}/opengraph-image.png`,
    servesCuisine: "Cócteles granizados",
    priceRange: "$$",
    telephone: `+${WHATSAPP_NUMBER}`,
    hasMap: MAPS_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS_LINES.slice(1).join(", "),
      addressLocality: "Tuluá",
      addressRegion: "Valle del Cauca",
      addressCountry: "CO",
    },
  };

  const items = products.map((p) => ({
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.imageUrl ? `${origin}${p.imageUrl}` : `${origin}/opengraph-image.png`,
    category: p.categoryName,
    offers: {
      "@type": "Offer",
      price: String(p.priceCop), // raw integer COP string, e.g. "18000" — NOT formatCop()
      priceCurrency: "COP",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${origin}/#business` },
    },
  }));

  const json = {
    "@context": "https://schema.org",
    "@graph": [business, ...items],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
```

Mount in `app/page.tsx`: render `<JsonLd />` inside the returned fragment, immediately after `<Snowfall />` (line 15). Because it `await`s inside an already-async server component, it adds no client JS. `p.imageUrl` is `string | null` (`lib/types.ts`); the null branch falls back to the OG image. `p.imageUrl` values start with `/images/...`, so `${origin}${p.imageUrl}` yields a valid absolute URL. Note: a future inventory/sold-out workstream is the natural place to map `availability` to `OutOfStock`; for now `getProducts()` returns only active products (`is_active`), so `InStock` is correct.

> Decision: place JSON-LD on the home page only (the primary indexable entity page). Mounting on `/menu` too is optional and not required for launch; it avoids duplicate-entity noise.

### Step 5 — Open Graph + Twitter images (file convention, new)
Drop two static `1200x630` PNGs using the Next file convention:
- `app/opengraph-image.png` — Next auto-emits `og:image` + `og:image:width/height/type`.
- `app/twitter-image.png` — Next auto-emits `twitter:image`. (The opengraph-image convention does **not** populate `twitter:image`, so this separate file is required to guarantee the Twitter/X card image. It may be a byte-for-byte copy of the OG asset.)

Add matching alt files:
- `app/opengraph-image.alt.txt` containing `Polar — Cócteles Granizados en Tuluá`.
- `app/twitter-image.alt.txt` containing the same alt text.

The image asset should reflect the brand (dark `#040512` bg, magenta `#9128DA` accent, the Polar logo and a cocktail cup). The executing subagent should compose it from existing brand assets in `public/images/` (e.g. `polar logo.jpg`, a trimmed cocktail PNG like `polar-cocktail-product-transparent-trimmed.png`) — produce a flat 1200x630 PNG, place it at `app/opengraph-image.png`, and copy it to `app/twitter-image.png`. Keep file size well under 8MB (trivial for a flat PNG). Do **not** generate via `app/opengraph-image.tsx` (ImageResponse) unless a static asset cannot be produced — the static file is lower-risk and adds no runtime/edge dependency.

### Step 6 — `app/robots.ts` (new)
Allow crawling of public routes, disallow private ones, point at the sitemap. Uses `siteUrl()` so the absolute sitemap URL is correct per environment.

```ts
// app/robots.ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/checkout", "/order"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
```

### Step 7 — `app/sitemap.ts` (new)
List only the public, indexable routes (`/` and `/menu`). Static and simple — do not enumerate product URLs (products are sections, not standalone routes in this app).

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/menu`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
}
```

These return static data (no request-time API), so they stay compatible with the static build.

### Step 8 — Analytics (`components/seo/Analytics.tsx`, new + mount in layout)
Recommend `@vercel/analytics` as the lowest-friction option on Vercel (zero config, cookieless, no consent banner). Optionally `@vercel/speed-insights`. Gate behind an env flag so demo/local/CI builds stay clean, and exclude `/admin` so internal usage is not tracked.

1. Install (regenerates `package-lock.json` — use npm to match the present lockfile, NOT pnpm):
```
npm install @vercel/analytics @vercel/speed-insights
```
If the sandbox has no network (or Corepack enforces pnpm and the install warns/fails), defer the install to a documented follow-up and keep the component a flag-gated no-op so the build still passes. The component must render `null` whenever the flag is off, so a missing module never breaks the build at the flag-off path.

2. Component:
```tsx
// components/seo/Analytics.tsx
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
```

3. Mount in `app/layout.tsx` inside `<Providers>`, after `<CartDrawer />` (line 53), so it loads site-wide but self-excludes `/admin` at runtime. `NEXT_PUBLIC_ANALYTICS` is documented in `.env.example` (Step 1); set it to `1` in Vercel production.

4. Document alternatives in the PR description: **Plausible** or **GA4** via `@next/third-parties/google` (`<GoogleAnalytics gaId=... />`), same flag-gating and admin exclusion. Any of these adds a dependency and must update `package-lock.json`.

### Step 9 — Favicon / app icons
`app/favicon.ico` already exists (confirmed). No action required for launch. Optionally add `app/icon.png` (any square PNG) and `app/apple-icon.png` for richer device icons via the file convention — document as nice-to-have, not blocking.

## Database changes
None. This workstream adds no tables, columns, RLS, or `create_order` RPC changes. JSON-LD reads through the existing `getProducts()` query, which already encapsulates the `hasSupabaseEnv()` branch and seed fallback.

## Demo-mode parity
- `siteUrl()` resolves to `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL`/`VERCEL_URL` are unset, so `metadataBase`, `sitemap.ts`, `robots.ts`, and JSON-LD all produce valid absolute URLs in demo/local/CI with zero env.
- `app/sitemap.ts` and `app/robots.ts` return static data (no request-time API) → they do not force any route dynamic and stay compatible with the static build of `/` and `/menu`.
- `JsonLd` calls `getProducts()`, which returns `SEED_PRODUCTS` when `hasSupabaseEnv()` is false — so structured data renders identically in demo mode and during `npm run build`'s static generation of `/`. No new data path bypasses the seed fallback.
- The Open Graph and Twitter images are static files; no DB or env dependency.
- Analytics is `NEXT_PUBLIC_ANALYTICS`-gated and returns `null` by default, so demo mode and the static build inject no tracking script. If the `@vercel/*` deps are not installed yet, keep the component a no-op so the build never fails on a missing module.
- `robots: { index: false }` on checkout/order/admin and the `robots.ts` Disallow do not change those routes' existing `force-dynamic` behavior — only `<head>` tags / `robots.txt` output.

## Affected files
- `app/layout.tsx` — full templated `metadata` (metadataBase, title template, OG, Twitter, keywords, robots); mount `<Analytics />`.
- `app/page.tsx` — render `<JsonLd />` after `<Snowfall />`.
- `app/menu/page.tsx` — leaf title `"Menú"`, add canonical.
- `app/checkout/page.tsx` — leaf title + `robots: { index: false, follow: false }`.
- `app/order/[id]/page.tsx` — leaf title + `robots: { index: false, follow: false }`.
- `app/(admin)/admin/(shell)/layout.tsx` — leaf title `"Panel"` + `robots: { index: false, follow: false }`.
- `.env.example` — add `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_ANALYTICS`.
- `package.json` / `package-lock.json` — add `@vercel/analytics` (+ optional `@vercel/speed-insights`) via npm.
- **New:** `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.png`, `app/opengraph-image.alt.txt`, `app/twitter-image.png`, `app/twitter-image.alt.txt`, `components/seo/JsonLd.tsx`, `components/seo/Analytics.tsx`.

## Verification
Gates:
1. `npx tsc --noEmit` — types clean (esp. `MetadataRoute.Sitemap` / `MetadataRoute.Robots` and `Metadata` shapes).
2. `npm run lint` — ESLint flat config clean (no emojis introduced; `dangerouslySetInnerHTML` is intentional and scoped to JSON-LD only).
3. `npm run build` — canonical gate. Confirm `/` and `/menu` still statically generate from seed data with no Supabase env and no `NEXT_PUBLIC_SITE_URL`; confirm `/sitemap.xml`, `/robots.txt`, and the OG/Twitter image routes appear in the build output; confirm the build does not fail on the analytics import when the flag/dep is absent.

Manual checks (run `npm run dev`, demo mode, no env):
- View source of `/` and `/menu`: `<title>` reflects the templated names ("Polar — Cócteles Granizados en Tuluá" and "Menú — Polar"); `<meta property="og:*">`, `<meta name="twitter:card" content="summary_large_image">`, and both `og:image` + `twitter:image` (from the file conventions) are present and absolute.
- `/sitemap.xml` lists exactly `/` and `/menu` with absolute URLs; `/robots.txt` shows `Disallow: /admin`, `/checkout`, `/order` and a `Sitemap:` line.
- View source of `/`: exactly one `<script type="application/ld+json">` containing a `Restaurant` node + 6 `Product`/`Offer` nodes with `price: "18000"` and `priceCurrency: "COP"` (validate by pasting into the schema.org validator — no errors). Do not run Google Rich Results validation against placeholder NAP.
- `/checkout` and `/order/<any-id>` `<head>` include `<meta name="robots" content="noindex, nofollow">`; admin routes likewise and are also Disallowed in robots.txt.
- OG preview: load `app/opengraph-image.png` and `app/twitter-image.png` directly and confirm each is a 1200x630 brand image; optionally check the share preview in a debugger once a real domain is set.
- Analytics: with `NEXT_PUBLIC_ANALYTICS` unset → no tracking script in page source on `/`. With it set to `1` → script present on `/` and `/menu` but **absent** on `/admin` (verify via Network tab / page source).
- Responsive: confirm none of these changes alter visible layout at desktop and mobile widths (SEO/metadata are head-only; JSON-LD and analytics render no visible UI). Spot-check `/` and `/menu` against `design/PolarUIPrototype.png` to confirm no regression.

Confirm explicitly in the PR description that demo mode and the static build of `/` and `/menu` still pass with zero env, and note that `NEXT_PUBLIC_SITE_URL` + `NEXT_PUBLIC_ANALYTICS` must be set in Vercel for production correctness.

## Risks & open questions
- **Site URL**: `metadataBase`/sitemap/robots/JSON-LD need a real origin. The `siteUrl()` fallback chain keeps builds green, but production OG/canonical/sitemap URLs are wrong until `NEXT_PUBLIC_SITE_URL` is set in Vercel. Must be set before launch (open question: production domain).
- **Placeholder NAP data**: `WHATSAPP_NUMBER` is still `573000000000` and the address may be partial. JSON-LD `telephone`/`address` will be placeholder until the config workstream fills real values; do not submit the site to Google rich-results validation with fake NAP. No exact lat/long known → geo omitted (add a TODO when coordinates are available).
- **Package-manager ambiguity**: `package.json` declares `packageManager: "pnpm@10.28.2..."` but the only lockfile on disk is `package-lock.json` and the repo docs all use `npm`. Add deps with `npm install` so `package-lock.json` is the updated lockfile; if Corepack enforces pnpm and the install warns/fails, the executor should note it and keep `Analytics` a flag-gated no-op so the build never breaks. Do **not** introduce a `pnpm-lock.yaml`.
- **New dependencies**: `@vercel/analytics` (+ optional speed-insights) require an install to regenerate `package-lock.json`. If the sandbox lacks network, defer install and keep `Analytics` a flag-gated no-op so the build never breaks. Plausible/GA4 via `@next/third-parties` are documented alternatives with the same gating.
- **OG image asset**: recommend a static PNG; if no suitable brand composite can be produced, fall back to `app/opengraph-image.tsx` (ImageResponse) — noted as the secondary option to avoid blocking.
- **Marketing copy vs catalog**: the reused meta description says "12 sabores y 8 combinaciones" while seed-data has 6 products. This is pre-existing storefront copy and stays only in the meta description; JSON-LD uses the real product list, so structured data remains truthful.
- **Analytics privacy**: Vercel Analytics is cookieless; still excluded from `/admin`. Confirm the injected script does not conflict with any future CSP (none configured today).
