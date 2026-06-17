# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The import above is load-bearing: this is **Next.js 16 + React 19**. APIs and file
> conventions differ from older Next.js — e.g. `cookies()` is async, and the request
> interceptor lives in **`proxy.ts`** (the old `middleware.ts` convention is deprecated).
> When unsure about a Next API, read `node_modules/next/dist/docs/` before writing code.

## What this is

**Polar** — a pixel-perfect Spanish-language storefront + WhatsApp-based ordering + admin for a
granizado / frozen-cocktail shop. Production: <https://polarcocktails.com> (Vercel + Supabase
Cloud). The source of truth for the design is `design/PolarUIPrototype.png`; visual changes are
expected to match it. Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
Supabase (Postgres + Auth + Storage).

## Commands

```bash
pnpm dev                # dev server (Turbopack) at http://localhost:3000
pnpm build              # production build (also the canonical correctness gate — exercises RSC/SSG)
pnpm start              # serve the production build
pnpm lint               # eslint (flat config in eslint.config.mjs)
pnpm exec tsc --noEmit  # type-check only
```

There is **no test framework** configured. Verify changes with `tsc --noEmit`, `pnpm lint`,
`pnpm build`, and by driving the running app (the prototype is the visual oracle).

`pnpm dev` symlinks `.env.local` to a profile file; switch with `pnpm env:cloud` /
`pnpm env:local` and check the active one with `pnpm env:which` (see `SETUP.md`). Delete the
symlink for pure demo mode.

Supabase: no CLI is wired into the scripts — apply `supabase/migrations/0001..0012` **in order**
by hand in the Supabase SQL editor (they are idempotent), or push them through a linked Supabase
CLI. `0009_admin_rls.sql` requires every admin to already carry an `app_metadata.role` claim, so
set roles first or you lock admins out. See `SETUP.md` / `LAUNCH_RUNBOOK.md` for the full go-live
order.

## The central architectural idea: demo mode vs DB mode

Everything keys off **`hasSupabaseEnv()`** (`lib/supabase/env.ts`), which is true only when
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are both set.

- **No env (demo mode):** the menu comes from `lib/seed-data.ts`; `proxy.ts` passes every
  request through with no auth; `createOrder` recomputes the total and returns a generated
  `orderId` without persisting. The whole storefront + checkout demo works with zero setup.
- **With env (DB mode):** queries hit Supabase, `proxy.ts` refreshes the session and gates
  `/admin/*`, and orders persist via the `create_order` RPC.

When adding any data path, branch on `hasSupabaseEnv()` and keep the seed fallback working —
`pnpm build` statically generates `/` and `/menu` using seed data.

## Server/client boundaries (how data flows)

- **Reads** happen in Server Components via `lib/queries/*` (`menu.ts`, `orders.ts`, `site.ts`) —
  no API routes for fetching.
- **Writes** are Server Actions in `lib/actions/*` (`orders.ts`, `products.ts`, `categories.ts`,
  `auth.ts`, `admins.ts`, `site.ts`), each re-checking auth for admin mutations and calling
  `revalidatePath('/')`/`/menu` after catalog edits.
- **Order integrity:** `createOrder` re-fetches prices server-side and recomputes
  `unit_price`/`line_total`/`total` — **client-sent prices are never trusted** (trust lives in the
  action / `create_order` RPC, not the client). It is also **IP rate-limited** via
  `lib/rate-limit.ts` (an in-memory per-key fixed-window limiter) because it is callable
  unauthenticated.
- **WhatsApp handoff:** checkout's `createOrder` returns a server-trusted `OrderSummary`; the
  confirmation flow (`components/order/WhatsAppHandoff.tsx` + `lib/whatsapp.ts`) builds a `wa.me`
  link from that summary — never from cart state. Customer fields are sanitized before being put
  in the message.
- **Three Supabase clients** in `lib/supabase/`: `client.ts` (browser), `server.ts` (RSC/actions;
  `await cookies()`), `middleware.ts` (the `updateSession` helper that `proxy.ts` calls — note
  this file keeps its name; only the root convention file is `proxy.ts`). A fourth, `admin.ts`, is
  the **service-role** client: it bypasses RLS and is server-only, constructed **only** behind
  `requireSuperAdmin()` in `lib/actions/admins.ts`.

## Auth and admin model

- Authorization uses **`getUser()`** (validates the JWT) in `proxy.ts`, the admin layout, and the
  `lib/auth.ts` guards — **never `getSession()`**.
- `requireAdmin()` passes when the user **either** is the `SUPER_ADMIN_EMAIL` user **or** carries
  `app_metadata.role` in `{admin, super_admin}`; it fails closed otherwise. `app_metadata` is
  writable only with the service-role key, so the claim is trustworthy. The DB-layer `is_admin()`
  (migration 0009) mirrors this on the role claim.
- `requireSuperAdmin()` passes only for the `SUPER_ADMIN_EMAIL` user (managing other admins at
  `/admin/admins`).
- **The legacy `ADMIN_EMAIL` env var is no longer read by the app — do not document or use it as
  an auth mechanism.** Create admins with `node scripts/create-admin-user.mjs`, grant with
  `node scripts/set-admin-role.mjs <email> admin`, or add them in-app at `/admin/admins`.

## Security

- `next.config.ts` sets `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, and a **report-only**
  Content-Security-Policy (report-only because Tailwind v4 inline styles + Vercel Analytics need
  it loosened today — observe reports before enforcing). It also pins the remote-image host to the
  Supabase Storage hostname.
- Image uploads are validated in `lib/storage.ts` (MIME allowlist + 5 MB cap), and the public
  Storage buckets (`product-images`, `site-assets`) are size/MIME limited at the DB level in
  migration `0012`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never add the `NEXT_PUBLIC_` prefix.

## Styling system (Tailwind v4 — read before touching UI)

There is **no `tailwind.config.ts`**. The theme is CSS-first in `app/globals.css`:
- An `@theme` block defines the `polar-*` color tokens (bg `#040512`, accent `#9128DA`, …) and
  the `font-display`/`font-body` tokens (Poppins / Inter, wired in `app/layout.tsx`).
- A set of **global component classes** — `.container-polar`, `.btn-brand`, `.btn-ghost`,
  `.btn-outline-rect`, `.glass-card`, `.pill-active`, `.pill-inactive`, `.hero-title`,
  `.hero-glow`, `.eyebrow`, `.icon-chip`. **Reuse these instead of inventing parallel styles**;
  they are how visual consistency with the prototype is maintained.

Conventions: **no emojis** — every icon is an inline SVG in `components/icons/` (re-exported
from `index.ts`). Product/hero/footer imagery uses `PlaceholderCup` (a gradient cup driven by
each product's `accentColor`); it is automatically replaced by a real photo wherever a
product's `imageUrl` is set. Prices are **integer COP**, always rendered through
`formatCop()` (`lib/format.ts`) — never use floats.

## Layout map

- Public routes live under the **`app/(site)/*`** route group: `page.tsx` (storefront) plus
  `menu`, `checkout`, `order/[id]`, `nosotros`, `ubicacion`, `contacto`. The storefront composes
  `components/sections/*` (Hero, HomeVideo, Sabores, InfoRow, Nosotros) + `components/menu/*`
  (ProductGrid/Card, CategoryTabs, ProductDetailModal); `menu` reuses the same grid.
- Cart is client-only: `components/cart/CartProvider.tsx` (Context + reducer + `localStorage`
  key `polar_cart`, with a `mounted` flag to avoid hydration mismatch on the count). Mounted in
  `components/Providers.tsx` from `app/layout.tsx`.
- Checkout/confirmation: `app/(site)/checkout` + `components/checkout/*` → `createOrder` →
  `app/(site)/order/[id]` → WhatsApp handoff. These pages are `dynamic = 'force-dynamic'`.
- Admin lives under route groups: `app/(admin)/admin/(auth)/login` and
  `app/(admin)/admin/(shell)/*` (dashboard, products, categories, orders, settings, branding,
  admins), with shared pieces in `app/(admin)/admin/_components/` and `_lib/`. All admin pages
  are `force-dynamic`.
- SEO is centralized: `lib/seo.ts` `siteUrl()` reads `NEXT_PUBLIC_SITE_URL` (defaulting to the
  `https://polarcocktails.com` production origin) and feeds `metadataBase`, Open Graph,
  `app/sitemap.ts`, `app/robots.ts`, and `components/seo/JsonLd.tsx`.
- Shop constants (WhatsApp number, address, Maps URL, nav links, social links) are placeholders in
  `lib/config.ts` — update there, not inline.
