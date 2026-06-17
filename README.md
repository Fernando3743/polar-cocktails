# Polar

Spanish-language storefront, WhatsApp-based checkout, and admin backend for
**Polar**, a granizado / frozen-cocktail shop in Tuluá, Colombia.

Production: <https://polarcocktails.com> (Vercel + Supabase Cloud).

The app runs in two modes. With no Supabase configuration it serves the entire
storefront and checkout from bundled seed data (demo mode); with Supabase
configured it reads/writes Postgres, persists orders, and gates the admin area.

Stack: **Next.js 16 (App Router) - React 19 - TypeScript - Tailwind CSS v4
(CSS-first) - Supabase (Postgres + Auth)**.

The visual source of truth is `design/PolarUIPrototype.png`; UI changes are
expected to match it.

## Features

- Public storefront: hero with optional background video, flavor highlights,
  about/location/contact pages, and responsive navigation (desktop + mobile).
- Full menu page with category filtering, product detail modal, and cart.
- Client-side cart persisted to `localStorage` (key `polar_cart`).
- Checkout that validates input and **recomputes every price server-side**, then
  hands off to WhatsApp: the confirmation page opens a `wa.me` link with a
  server-trusted order summary.
- Order confirmation page (`/order/[id]`).
- Admin area for products, categories, orders and order status, shop settings,
  branding/multimedia, and (super admin only) admin-user management.
- Optional Supabase-backed persistence, auth, image uploads, and inventory.
- SEO: metadata, Open Graph / Twitter images, JSON-LD, sitemap, robots; opt-in
  Vercel Analytics + Speed Insights.

## Tech stack

| Area        | Choice                                                        |
| ----------- | ------------------------------------------------------------ |
| Framework   | Next.js 16 (App Router, Server Components, Server Actions)    |
| UI runtime  | React 19                                                     |
| Language    | TypeScript                                                  |
| Styling     | Tailwind CSS v4 (CSS-first; no `tailwind.config`)           |
| Data / Auth | Supabase (Postgres + Auth + Storage)                        |
| Validation  | Zod                                                         |
| Hosting     | Vercel                                                      |
| Package mgr | pnpm                                                        |

## Quick start

### Prerequisites

- Node.js compatible with Next.js 16 (Node 20 or 22 recommended; this is what to
  pin on Vercel).
- pnpm (`corepack enable` provides it; the repo pins a version via
  `packageManager` in `package.json`).
- A Supabase project, only if you want database-backed orders and the admin area.

### Install and run (demo mode, no database)

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. With no Supabase environment variables the app runs
in **demo mode**:

- Storefront and menu data come from `lib/seed-data.ts`.
- Checkout validates and recomputes totals, then returns a generated order id.
- Orders are not persisted.
- The admin area / auth is disabled and `proxy.ts` passes every request through.

> Note: `pnpm dev` (and `pnpm prod`) symlink `.env.local` to one of the profile
> files described below. To run pure demo mode, remove the `.env.local` symlink
> (or use a profile whose `NEXT_PUBLIC_SUPABASE_*` values are empty).

### Environment variables

Copy `.env.example` to `.env.local` and fill in what you need:

```bash
NEXT_PUBLIC_SUPABASE_URL=        # half of hasSupabaseEnv(); public
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # half of hasSupabaseEnv(); public
SUPABASE_SERVICE_ROLE_KEY=       # server-only; admin-user management; bypasses RLS
SUPER_ADMIN_EMAIL=               # server-only; the single super admin (owner)
NEXT_PUBLIC_SITE_URL=            # absolute prod origin for SEO/canonical
NEXT_PUBLIC_ANALYTICS=           # set to 1 to enable Vercel Analytics
NEXT_PUBLIC_HOME_VIDEO_URL=      # optional public URL for the home hero video
```

DB mode is enabled only when **both** `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are present (`hasSupabaseEnv()` in
`lib/supabase/env.ts`). `SUPABASE_SERVICE_ROLE_KEY` is read server-side only by
`lib/supabase/admin.ts`; never prefix it with `NEXT_PUBLIC_` (a leaked
service-role key is full database access).

### Switching Supabase profiles (cloud vs local)

Next.js only auto-loads `.env.local`. To switch between the cloud project and a
local `supabase start` stack, `.env.local` is a **symlink** to one of two real,
gitignored profile files:

- `.env.cloud` - the production Supabase project.
- `.env.localdb` - a local `supabase start` stack at `http://127.0.0.1:54321`.

```bash
pnpm env:cloud    # point .env.local -> .env.cloud (production project)
pnpm env:local    # point .env.local -> .env.localdb (local stack)
pnpm env:which    # show which profile is active
```

Edit the profile files, not `.env.local` (writing to the symlink follows it into
the active profile). The local profile needs its own running stack plus its own
migrations, seed, and admin user.

### Production build

```bash
pnpm build && pnpm start
```

`pnpm build` is also the canonical correctness gate: it exercises RSC and static
generation, and statically builds `/` and `/menu` from seed data.

## Demo mode vs DB mode

Everything keys off `hasSupabaseEnv()`:

| Concern    | Demo mode (no Supabase env)                | DB mode (Supabase env set)                       |
| ---------- | ------------------------------------------ | ------------------------------------------------ |
| Catalog    | `lib/seed-data.ts`                         | Supabase Postgres via `lib/queries/*`            |
| Checkout   | Validates + recomputes; returns a fake id  | Persists atomically via the `create_order` RPC   |
| Orders     | Not persisted                              | Stored in Postgres                               |
| Auth       | Disabled; `proxy.ts` passes through        | `proxy.ts` refreshes sessions and gates `/admin` |
| Admin      | Unavailable                                | Available to admins                              |

When adding any data path, branch on `hasSupabaseEnv()` and keep the seed
fallback working so the home and menu pages still build with no Supabase.

## Project structure

```text
app/
  (site)/                    Public routes (home, menu, checkout, order, nosotros,
                             ubicacion, contacto) + their layout
  (admin)/admin/             Admin: (auth)/login and (shell)/* (dashboard, products,
                             categories, orders, settings, branding, admins),
                             plus _components/ and _lib/
  globals.css                Tailwind v4 theme tokens + global component classes
  layout.tsx                 Root layout, fonts, metadata
  sitemap.ts, robots.ts,     SEO route handlers and PWA manifest
  manifest.ts
components/
  cart/                      Cart context, reducer, drawer (client-only)
  checkout/                  Checkout form
  order/                     WhatsApp handoff
  layout/                    Navbar, footer, mobile nav, snowfall
  menu/                      Product grid, cards, category tabs, detail modal
  sections/                  Storefront sections (Hero, HomeVideo, Sabores, ...)
  icons/                     Inline SVG icons (re-exported from index.ts; no emojis)
  seo/                       Analytics + JSON-LD
lib/
  actions/                   Server Actions (orders, products, categories, auth,
                             admins, site)
  queries/                   Server-side reads (menu, orders, site)
  supabase/                  client.ts (browser), server.ts (RSC/actions),
                             middleware.ts (session refresh), admin.ts
                             (service-role, server-only), env.ts, public.ts
  auth.ts                    requireAdmin / requireSuperAdmin / isSuperAdmin
  rate-limit.ts              In-memory per-key rate limiter
  storage.ts                 Validated public image uploads
  whatsapp.ts                Builds the wa.me order message
  config.ts                  Shop constants (WhatsApp, address, maps, nav links)
  seo.ts, format.ts          siteUrl(), formatCop(), etc.
  types.ts                   Shared domain types
  validation/schemas.ts      Zod schemas
supabase/migrations/         SQL migrations 0001..0012
scripts/                     create-admin-user.mjs, set-admin-role.mjs
proxy.ts                     Next 16 request interceptor (gates /admin in DB mode)
next.config.ts               Image config + security headers + report-only CSP
design/PolarUIPrototype.png  Visual source of truth
```

Useful routes: `/`, `/menu`, `/checkout`, `/order/[id]`, `/nosotros`,
`/ubicacion`, `/contacto`, and the admin pages under `/admin` (`/admin/products`,
`/admin/categories`, `/admin/orders`, `/admin/settings`, `/admin/branding`,
`/admin/admins`).

## Supabase setup

There is no Supabase CLI wired into the scripts. Apply the migrations in order
from the Supabase SQL editor (they are idempotent), or push them through a linked
Supabase CLI:

```text
supabase/migrations/0001_init.sql                    tables, enums, seed catalog
supabase/migrations/0002_rls.sql                     RLS + first create_order RPC
supabase/migrations/0003_inventory.sql               sold_out / stock_qty
supabase/migrations/0004_promos.sql                  legacy promos (historical order)
supabase/migrations/0005_order_short_code.sql        POL- short codes
supabase/migrations/0006_review_fixes.sql            order-integrity fixes
supabase/migrations/0007_site_config.sql             site_assets/shop_settings + buckets
supabase/migrations/0008_inventory_reactivation_fix.sql
supabase/migrations/0009_admin_rls.sql               admin-role RLS (see warning below)
supabase/migrations/0010_remove_promos.sql           remove promos (apply after 0009)
supabase/migrations/0011_public_grants.sql           restore anon/auth grants (db push)
supabase/migrations/0012_audit_hardening.sql         least-privilege + Storage limits
```

Migration `0009` makes the database require an `app_metadata.role` claim for
admin access. Set every admin's role claim (step below) **before** applying it,
or you will lock admins out of the database.

See `SETUP.md` and `LAUNCH_RUNBOOK.md` for the full ordered go-live checklist
(auth URL config, image backfill, placeholders to replace).

## Admin setup

Auth is server-side and uses `getUser()` (which validates the JWT) - never
`getSession()`. A request is authorized as admin when the user **either** is the
`SUPER_ADMIN_EMAIL` user **or** carries `app_metadata.role` in
`{admin, super_admin}`. The DB-layer `is_admin()` (migration 0009) mirrors this on
the role claim. `app_metadata` is writable only with the service-role key, so the
claim is a trustworthy authorization signal.

> The legacy `ADMIN_EMAIL` environment variable is **no longer read** by the app.
> Do not rely on it.

1. Disable public email sign-ups in Supabase Authentication.
2. Create the owner auth user:

   ```bash
   node --env-file=.env.local scripts/create-admin-user.mjs <email> <password>
   ```

3. Grant a role claim (do this before applying migration 0009):

   ```bash
   node --env-file=.env.local scripts/set-admin-role.mjs <owner-email> super_admin
   node --env-file=.env.local scripts/set-admin-role.mjs <email> admin
   ```

4. Set `SUPER_ADMIN_EMAIL` to the owner's email. The super admin can never be
   locked out or removed via the UI and is the only one who sees
   **Administradores** at `/admin/admins`, where further admins can be created
   in-app (no env edits, no redeploy). Regular admins manage the catalog, orders,
   settings, and multimedia, but not other admins.

The service-role client (`lib/supabase/admin.ts`) is constructed only inside
`requireSuperAdmin()`-gated actions in `lib/actions/admins.ts`.

## Deployment (Vercel + Supabase)

Import the repo in Vercel (Next.js is auto-detected). There is no `vercel.json`
and no `tailwind.config.ts`. Pin the Node version to 20 or 22 in Project Settings
-> General -> Node.js Version. Set the environment variables before the first
deploy:

| Var                          | Read by app? | Scope                          |
| ---------------------------- | ------------ | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`     | Yes (half of `hasSupabaseEnv()`) | Production            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Yes (half of `hasSupabaseEnv()`) | Production            |
| `SUPABASE_SERVICE_ROLE_KEY`    | Yes (admin management)           | Production, server only |
| `SUPER_ADMIN_EMAIL`            | Yes (identifies super admin)     | Production, server only |
| `NEXT_PUBLIC_SITE_URL`         | Yes (SEO / canonical)            | Production = real domain |
| `NEXT_PUBLIC_ANALYTICS`        | Yes (set to `1` to enable)       | Production = `1`        |
| `NEXT_PUBLIC_HOME_VIDEO_URL`   | Yes (home hero video)            | Production             |

For production, set `NEXT_PUBLIC_SITE_URL=https://polarcocktails.com`. It feeds
`metadataBase`, Open Graph, the sitemap, robots, and JSON-LD (`lib/seo.ts`).
Leave the `NEXT_PUBLIC_SUPABASE_*` vars **unset** for the Preview scope so PR
previews run in demo mode and never touch live data. In Supabase ->
Authentication -> URL Configuration, set the Site URL and Redirect URLs to the
production and preview domains, or admin login can fail in production.

Vercel deployments are immutable; roll back instantly with Promote to Production
on a previous good deploy.

## Architecture and security notes

- **Reads** live in Server Components and `lib/queries/*`; **writes** are Server
  Actions in `lib/actions/*`. There are no API routes for data fetching.
- **Order integrity:** `createOrder` re-fetches prices server-side (DB
  `create_order` RPC, or seed prices in demo mode) and recomputes every
  `unit_price` / `line_total` / `total`. Client-supplied prices are never
  trusted. The action is also **IP rate-limited** (`lib/rate-limit.ts`) because
  it is callable unauthenticated.
- **Auth boundary:** `proxy.ts` (the Next 16 request interceptor, replacing
  `middleware.ts`) gates `/admin` in DB mode; admin mutations re-check
  `requireAdmin()` server-side. The service-role client is only used behind
  `requireSuperAdmin()`.
- **Headers / CSP:** `next.config.ts` sets HSTS, `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and a
  **report-only** Content-Security-Policy. Image uploads are validated
  (`lib/storage.ts`, MIME + 5 MB limit) and the public Storage buckets are
  size/MIME limited at the database level (migration 0012).
- **Prices** are integer COP, always rendered through `formatCop()`
  (`lib/format.ts`) - never floats.

## Development

```bash
pnpm dev                # dev server (Turbopack) at http://localhost:3000
pnpm build              # production build + canonical correctness gate
pnpm start              # serve the production build
pnpm lint               # ESLint (flat config)
pnpm exec tsc --noEmit  # type-check only
```

There is no test framework. Verify changes with `tsc --noEmit`, `pnpm lint`,
`pnpm build`, and by driving the running app against the prototype. Customer copy
is Spanish; icons are inline SVGs in `components/icons/` (no emojis); reuse the
global component classes in `app/globals.css`.
