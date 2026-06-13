# Polar

Spanish-language storefront, checkout flow, and admin backend for Polar, a
granizado / frozen-cocktail shop.

The app is built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
v4, and Supabase. It can run locally without Supabase in demo mode, using bundled
seed data and a non-persisted checkout flow.

## Features

- Public storefront with hero, menu highlights, location/contact sections, and
  responsive navigation.
- Full menu page with category filtering and cart integration.
- Checkout flow that validates orders and recomputes totals server-side.
- Order confirmation page.
- Admin area for products, categories, orders, and order status updates.
- Optional Supabase-backed persistence and auth.

## Requirements

- Node.js compatible with Next.js 16
- pnpm (bundled with Node via `corepack enable`)
- Supabase project, only if you want database-backed orders and admin features

## Getting Started

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

When Supabase environment variables are not configured, the app runs in demo
mode:

- Storefront data comes from `lib/seed-data.ts`.
- Checkout returns a generated order id.
- Orders are not persisted.
- Admin auth is disabled.

## Environment Variables

Copy `.env.example` to `.env.local` and fill the values if you want Supabase
mode:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
```

Supabase mode is enabled only when both public Supabase variables are present.
See `SETUP.md` for the full Supabase setup and handoff notes.

## Supabase Setup

Run the migrations in order from the Supabase SQL editor:

```text
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls.sql
```

Then disable public sign-ups in Supabase Auth and create one admin user matching
`ADMIN_EMAIL`. That user can sign in at `/admin`.

## Useful Routes

- `/` - storefront
- `/menu` - full menu
- `/checkout` - checkout
- `/order/[id]` - order confirmation
- `/admin` - admin dashboard
- `/admin/products` - product management
- `/admin/categories` - category management
- `/admin/orders` - order management

## Project Structure

```text
app/                         Next.js app routes
app/(admin)/admin/           Admin pages and components
components/cart/             Cart context, reducer, drawer, and button
components/checkout/         Checkout UI
components/layout/           Navbar, footer, mobile nav, shared layout pieces
components/menu/             Product grid, cards, and category tabs
components/sections/         Storefront sections
lib/actions/                 Server actions for auth, catalog, and orders
lib/queries/                 Server-side data reads
lib/supabase/                Supabase clients, env detection, and auth helpers
lib/validation/              Zod schemas
supabase/migrations/         Database schema and RLS migrations
design/PolarUIPrototype.png  Visual source of truth
```

## Scripts

```bash
pnpm dev                # start local development server
pnpm build              # create production build
pnpm start              # serve production build
pnpm lint               # run ESLint
pnpm exec tsc --noEmit  # type-check only
```

## Design Notes

The design reference is `design/PolarUIPrototype.png`. Customer-facing copy is in
Spanish, and the UI uses Tailwind v4 tokens and component classes from
`app/globals.css`.

Product imagery prefers `imageUrl` / `image_url` when present and falls back to
the local placeholder cup visuals.
