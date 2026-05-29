# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The import above is load-bearing: this is **Next.js 16 + React 19**. APIs and file
> conventions differ from older Next.js — e.g. `cookies()` is async, and the request
> interceptor lives in **`proxy.ts`** (the old `middleware.ts` convention is deprecated).
> When unsure about a Next API, read `node_modules/next/dist/docs/` before writing code.

## What this is

**Polar** — a pixel-perfect Spanish-language landing page + ordering backend + admin for a
granizado / frozen-cocktail shop. The source of truth for the design is
`design/PolarUIPrototype.png`; visual changes are expected to match it. Stack:
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth).

## Commands

```bash
npm run dev          # dev server (Turbopack) at http://localhost:3000
npm run build        # production build (also the canonical correctness gate — exercises RSC/SSG)
npm run start        # serve the production build
npm run lint         # eslint (flat config in eslint.config.mjs)
npx tsc --noEmit     # type-check only
```

There is **no test framework** configured. Verify changes with `tsc --noEmit`, `npm run lint`,
`npm run build`, and by driving the running app (the prototype is the visual oracle).

Supabase: there is no CLI wired up — apply `supabase/migrations/0001_init.sql` then
`0002_rls.sql` by hand in the Supabase SQL editor. See `SETUP.md` for the full go-live steps.

## The central architectural idea: demo mode vs DB mode

Everything keys off **`hasSupabaseEnv()`** (`lib/supabase/env.ts`), which is true only when
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

- **No env (demo mode):** the menu comes from `lib/seed-data.ts`; `proxy.ts` passes every
  request through with no auth; `createOrder` recomputes the total and returns a generated
  `orderId` without persisting. The whole storefront + checkout demo works with zero setup.
- **With env (DB mode):** queries hit Supabase, `proxy.ts` refreshes the session and gates
  `/admin/*`, and orders persist via the `create_order` RPC.

When adding any data path, branch on `hasSupabaseEnv()` and keep the seed fallback working —
`npm run build` statically generates `/` and `/menu` using seed data.

## Server/client boundaries (how data flows)

- **Reads** happen in Server Components via `lib/queries/*` (`menu.ts`, `orders.ts`) — no API
  routes for fetching.
- **Writes** are Server Actions in `lib/actions/*` (`orders.ts`, `products.ts`,
  `categories.ts`, `auth.ts`), each re-checking `getUser()` for admin mutations and calling
  `revalidatePath('/')`/`/menu` after catalog edits.
- **Order integrity:** `createOrder` re-fetches prices server-side and recomputes
  `unit_price`/`line_total`/`total` — **client-sent prices are never trusted** (RLS allows anon
  inserts, so trust lives in the action / `create_order` RPC, not the client).
- **Three Supabase clients** in `lib/supabase/`: `client.ts` (browser), `server.ts` (RSC/actions;
  `await cookies()`), `middleware.ts` (the `updateSession` helper that `proxy.ts` calls — note
  this file keeps its name; only the root convention file is `proxy.ts`).
- **Auth:** single admin user. Authorization uses `getUser()` (validates the JWT) in both
  `proxy.ts` and the admin layout — never `getSession()`.

## Styling system (Tailwind v4 — read before touching UI)

There is **no `tailwind.config.ts`**. The theme is CSS-first in `app/globals.css`:
- An `@theme` block defines the `polar-*` color tokens (bg `#040512`, accent `#9128DA`, …) and
  the `font-display`/`font-body` tokens (Poppins / Inter, wired in `app/layout.tsx`).
- A set of **global component classes** — `.container-polar`, `.btn-brand`, `.btn-ghost`,
  `.btn-outline-rect`, `.glass-card`, `.pill-active`, `.pill-inactive`, `.hero-glow`,
  `.eyebrow`, `.icon-chip`. **Reuse these instead of inventing parallel styles**; they are how
  visual consistency with the prototype is maintained.

Conventions: **no emojis** — every icon is an inline SVG in `components/icons/` (re-exported
from `index.ts`). Product/hero/footer imagery uses `PlaceholderCup` (a gradient cup driven by
each product's `accentColor`); it is automatically replaced by a real photo wherever a
product's `imageUrl` is set. Prices are **integer COP**, always rendered through
`formatCop()` (`lib/format.ts`) — never use floats.

## Layout map

- `app/page.tsx` storefront → `components/sections/*` (Hero, Sabores, InfoRow) +
  `components/menu/*` (ProductGrid/Card, CategoryTabs). `app/menu` reuses the same grid.
- Cart is client-only: `components/cart/CartProvider.tsx` (Context + reducer + `localStorage`
  key `polar_cart`, with a `mounted` flag to avoid hydration mismatch on the count). Mounted in
  `components/Providers.tsx` from `app/layout.tsx`.
- Checkout/confirmation: `app/checkout` + `components/checkout/*` → `createOrder` →
  `app/order/[id]`. These pages are `dynamic = 'force-dynamic'`.
- Admin lives under route groups: `app/(admin)/admin/(auth)/login` and
  `app/(admin)/admin/(shell)/*` (dashboard, products, categories, orders), with shared pieces in
  `app/(admin)/admin/_components/` and `_lib/`. All admin pages are `force-dynamic`.
- Shop constants (WhatsApp number, address, Maps URL, nav links) are placeholders in
  `lib/config.ts` — update there, not inline.
